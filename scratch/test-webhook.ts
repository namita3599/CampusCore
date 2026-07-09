import "dotenv/config";
import { prisma } from "../lib/prisma";
import crypto from "crypto";

async function run() {
  const webhookUrl = "http://localhost:3000/api/webhooks/razorpay";
  const webhookSecret = "test_secret_123";

  // Set environment variable temporarily for this run if needed,
  // but since Next.js server is already running, the server must have RAZORPAY_WEBHOOK_SECRET="test_secret_123" in its environment to verify it.
  console.log("Starting Webhook Integration Test...");

  // 1. Find a test student user and create a mock unpaid Invoice
  const student = await prisma.studentProfile.findFirst({
    include: {
      user: true,
      feeRecords: {
        where: { type: "TUITION", status: "UNPAID" }
      }
    }
  });

  if (!student) {
    console.error("No student profile found to run the test. Ensure the database is seeded.");
    return;
  }

  const feeRecord = student.feeRecords[0];
  if (!feeRecord) {
    console.error("No unpaid TUITION FeeRecord found for student:", student.name);
    return;
  }

  console.log(`Using student: ${student.name} (User ID: ${student.userId})`);

  // Create an invoice if not exists
  let invoice = await prisma.invoice.findFirst({
    where: { feeRecordId: feeRecord.id }
  });

  if (!invoice) {
    invoice = await prisma.invoice.create({
      data: {
        studentId: student.id,
        amount: feeRecord.amount,
        feeRecordId: feeRecord.id,
        isPaid: false,
      }
    });
    console.log("Created test Invoice ID:", invoice.id);
  } else {
    console.log("Using existing test Invoice ID:", invoice.id);
  }

  // 2. Create a pending Transaction record
  const testOrderId = `order_test_${Math.random().toString(36).substring(2, 10)}`;
  const transaction = await prisma.transaction.create({
    data: {
      invoiceId: invoice.id,
      userId: student.userId,
      amount: feeRecord.amount,
      status: "PENDING",
      razorpayOrderId: testOrderId,
    }
  });

  console.log(`Created pending Transaction ID: ${transaction.id} with Order ID: ${testOrderId}`);

  // 3. Construct Webhook payload
  const payload = {
    event: "order.paid",
    payload: {
      order: {
        entity: {
          id: testOrderId,
          amount: feeRecord.amount * 100,
          currency: "INR",
          status: "paid",
        }
      }
    }
  };

  const payloadString = JSON.stringify(payload);

  // 4. Cryptographically sign the payload using HMAC SHA256
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payloadString)
    .digest("hex");

  console.log("Generated Cryptographic Signature:", signature);

  // 5. Send POST request to the webhook endpoint
  console.log(`Sending Webhook payload to: ${webhookUrl}`);
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": signature,
      },
      body: payloadString,
    });

    const status = response.status;
    const responseText = await response.text();
    console.log(`Webhook Endpoint Response Status: ${status}`);
    console.log(`Response body: ${responseText}`);

    if (status === 200) {
      console.log("Verifying database updates...");
      // Fetch transaction, invoice, and fee records to see if they were updated
      const updatedTx = await prisma.transaction.findUnique({
        where: { id: transaction.id }
      });
      const updatedInv = await prisma.invoice.findUnique({
        where: { id: invoice.id }
      });
      const updatedRecord = await prisma.feeRecord.findUnique({
        where: { id: feeRecord.id }
      });
      const updatedProfile = await prisma.studentProfile.findUnique({
        where: { id: student.id }
      });

      console.log("- Transaction Status (Expected: SUCCESS):", updatedTx?.status);
      console.log("- Invoice Paid Status (Expected: true):", updatedInv?.isPaid);
      console.log("- FeeRecord Status (Expected: PAID):", updatedRecord?.status);
      console.log("- StudentProfile TuitionPaid (Expected: true):", updatedProfile?.tuitionPaid);

      if (
        updatedTx?.status === "SUCCESS" &&
        updatedInv?.isPaid &&
        updatedRecord?.status === "PAID" &&
        updatedProfile?.tuitionPaid
      ) {
        console.log("🎉 SUCCESS: Webhook processing and database transaction verified!");
      } else {
        console.error("❌ FAILURE: One or more database records were not updated correctly.");
      }
    } else {
      console.error("❌ FAILURE: Webhook request failed.");
    }
  } catch (err) {
    console.error("❌ FETCH ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
