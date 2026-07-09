"use server";

import { prisma } from "@/lib/prisma";
import Razorpay from "razorpay";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import crypto from "crypto";

let razorpayInstance: any = null;

function getRazorpayInstance() {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Razorpay credentials are not configured in the server environment.");
    }

    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayInstance;
}

/**
 * Initiates a payment transaction for a student invoice.
 * Creates a local Transaction in PENDING state, registers it with Razorpay to get an Order ID,
 * and updates the local Transaction record.
 */
export async function initiateTransaction(invoiceId: string, amount: number, userId: number) {
  // 1. Secure auth guard
  const session = await getServerSession(authOptions);
  if (!session || !session.user || parseInt(session.user.id) !== userId) {
    throw new Error("Unauthorized access. You are not permitted to initiate this payment.");
  }

  // 2. Fetch invoice and verify it is unpaid
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { student: true },
  });

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  if (invoice.isPaid) {
    throw new Error("This invoice has already been paid.");
  }

  // Validate the amount is matches the invoice amount (protection against client-side price tampering)
  if (Math.abs(invoice.amount - amount) > 0.01) {
    throw new Error("Transaction amount mismatch with the invoice.");
  }

  // Convert amount to paise (INR 1 = 100 paise)
  const amountInPaise = Math.round(amount * 100);

  // 3. Create a local Transaction record in PENDING state
  const transaction = await prisma.transaction.create({
    data: {
      invoiceId,
      userId,
      amount,
      status: "PENDING",
    },
  });

  try {
    // 4. Generate order ID on Razorpay
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: transaction.id,
      notes: {
        invoiceId,
        studentId: invoice.studentId.toString(),
        userId: userId.toString(),
      },
    });

    if (!order || !order.id) {
      throw new Error("Invalid response received from Razorpay gateway.");
    }

    // 5. Update local transaction with the Razorpay order ID
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        razorpayOrderId: order.id,
      },
    });

    return {
      success: true,
      transactionId: updatedTransaction.id,
      razorpayOrderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID || "",
    };
  } catch (error: any) {
    console.error("Razorpay order creation failed:", error);

    // Update transaction status to FAILED
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "FAILED" },
    });

    throw new Error(error.message || "Failed to create order with Razorpay payment gateway.");
  }
}

/**
 * Cryptographically verifies a successful Razorpay payment signature
 * and updates invoice, transaction, fee records, and student profiles.
 */
export async function verifyPayment(
  razorpayPaymentId: string,
  razorpayOrderId: string,
  razorpaySignature: string,
  invoiceId: string,
  userId: number
) {
  // 1. Secure auth guard
  const session = await getServerSession(authOptions);
  if (!session || !session.user || parseInt(session.user.id) !== userId) {
    throw new Error("Unauthorized payment verification.");
  }

  // 2. Cryptographic signature check
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error("Razorpay credentials are not configured on the server.");
  }

  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(razorpayOrderId + "|" + razorpayPaymentId)
    .digest("hex");

  if (generatedSignature !== razorpaySignature) {
    throw new Error("Payment signature verification failed.");
  }

  // 3. Atomically update database status inside a single transaction
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findFirst({
      where: { razorpayOrderId },
    });

    if (!transaction) {
      throw new Error("Associated transaction record not found.");
    }

    if (transaction.status === "SUCCESS") {
      return; // Already processed
    }

    // A. Update local Transaction status
    await tx.transaction.update({
      where: { id: transaction.id },
      data: { status: "SUCCESS" },
    });

    // B. Update Invoice status
    const invoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        isPaid: true,
        paidAt: new Date(),
      },
    });

    // C. Update related Student profile and fee record if a FeeRecord links to this invoice
    if (invoice.feeRecordId) {
      await tx.feeRecord.update({
        where: { id: invoice.feeRecordId },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });

      const feeRecord = await tx.feeRecord.findUnique({
        where: { id: invoice.feeRecordId },
      });

      if (feeRecord) {
        if (feeRecord.type === "TUITION") {
          await tx.studentProfile.update({
            where: { id: invoice.studentId },
            data: { tuitionPaid: true },
          });
        } else if (feeRecord.type === "HOSTEL") {
          await tx.studentProfile.update({
            where: { id: invoice.studentId },
            data: { hostelPaid: true },
          });
        }
      }
    }
  });

  return { success: true };
}

