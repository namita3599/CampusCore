import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body as text for cryptographic validation
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      console.warn("Received webhook without a signature.");
      return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not configured in the server environment variables.");
      return NextResponse.json({ error: "Webhook signature secret is not configured" }, { status: 500 });
    }

    // 2. Perform signature validation
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.warn("Signature verification failed for incoming Razorpay webhook.");
      return NextResponse.json({ error: "Invalid cryptographic signature" }, { status: 400 });
    }

    // 3. Parse payload after verification
    const payload = JSON.parse(rawBody);
    const event = payload.event;

    console.log(`Razorpay Webhook Event verified: ${event}`);

    // We respond success immediately or process the events we care about
    if (event === "order.paid") {
      const orderEntity = payload.payload.order.entity;
      const razorpayOrderId = orderEntity.id;

      console.log(`Webhook Order Paid Event details: Order ID = ${razorpayOrderId}`);

      // 4. Run database updates atomically inside a transaction
      await prisma.$transaction(async (tx) => {
        // Find local transaction
        const dbTransaction = await tx.transaction.findUnique({
          where: { razorpayOrderId },
        });

        if (!dbTransaction) {
          throw new Error(`Transaction with Razorpay order ID ${razorpayOrderId} not found.`);
        }

        // If transaction already marked successful, skip updates
        if (dbTransaction.status === "SUCCESS") {
          console.log(`Transaction ID ${dbTransaction.id} is already completed.`);
          return;
        }

        // A. Update local Transaction status
        await tx.transaction.update({
          where: { id: dbTransaction.id },
          data: { status: "SUCCESS" },
        });

        // B. Update Invoice status
        const updatedInvoice = await tx.invoice.update({
          where: { id: dbTransaction.invoiceId },
          data: {
            isPaid: true,
            paidAt: new Date(),
          },
        });

        // C. Update related Student profile and fee record if a FeeRecord links to this invoice
        if (updatedInvoice.feeRecordId) {
          await tx.feeRecord.update({
            where: { id: updatedInvoice.feeRecordId },
            data: {
              status: "PAID",
              paidAt: new Date(),
            },
          });

          // Fetch the FeeRecord details to know type
          const feeRecord = await tx.feeRecord.findUnique({
            where: { id: updatedInvoice.feeRecordId },
          });

          if (feeRecord) {
            if (feeRecord.type === "TUITION") {
              await tx.studentProfile.update({
                where: { id: updatedInvoice.studentId },
                data: { tuitionPaid: true },
              });
            } else if (feeRecord.type === "HOSTEL") {
              await tx.studentProfile.update({
                where: { id: updatedInvoice.studentId },
                data: { hostelPaid: true },
              });
            }
          }
        }
      });

      console.log(`Webhook processing completed successfully for Order ID: ${razorpayOrderId}`);
    }

    return NextResponse.json({ received: true, success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error processing Razorpay webhook:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
