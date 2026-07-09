"use client";

import { useState } from "react";
import { initiateTransaction, verifyPayment } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";

interface PaymentButtonProps {
  invoiceId: string;
  amount: number;
  userId: number;
  studentName: string;
  studentEmail?: string;
  studentPhone?: string;
  onSuccess?: () => void;
  className?: string;
  disabled?: boolean;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function PaymentButton({
  invoiceId,
  amount,
  userId,
  studentName,
  studentEmail,
  studentPhone,
  onSuccess,
  className = "",
  disabled = false,
}: PaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. Dynamic Injection of Razorpay Checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay payment gateway script. Please verify your connection.");
      }

      // 2. Call Server Action to initiate payment and create local Transaction record
      const res = await initiateTransaction(invoiceId, amount, userId);

      if (!res.success) {
        throw new Error("Order creation failed on the payment server.");
      }

      // 3. Configure Razorpay modal options
      const options = {
        key: res.keyId,
        amount: res.amount,
        currency: res.currency,
        name: "CampusCore ERP",
        description: `Tuition Fees (Invoice #${invoiceId.slice(0, 8)})`,
        order_id: res.razorpayOrderId,
        handler: async function (response: any) {
          try {
            // Verify payment receipt on success using cryptographic check on server
            await verifyPayment(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature,
              invoiceId,
              userId
            );

            if (onSuccess) {
              onSuccess();
            } else {
              // Redirect to receipt page with params
              window.location.href = `/dashboard/student/fees/receipt?invoiceId=${invoiceId}&paymentId=${response.razorpay_payment_id}`;
            }
          } catch (err: any) {
            console.error("Payment signature verification failed:", err);
            alert(err.message || "Payment verification failed. Please contact the administrator.");
            setIsProcessing(false);
          }
        },
        prefill: {
          name: studentName,
          email: studentEmail || "",
          contact: studentPhone || "",
        },
        theme: {
          color: "#09090b", // Sleek dark zinc/black
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Payment initiation flow error:", err);
      alert(err.message || "An error occurred while setting up the checkout gateway.");
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isProcessing}
      className={`w-full relative overflow-hidden group transition-all duration-300 py-3 font-semibold rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 shadow-sm border border-zinc-800 flex items-center justify-center gap-2 ${className}`}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-zinc-300" />
          <span>Securing payment session...</span>
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span>Pay Fee Securely</span>
        </>
      )}
    </Button>
  );
}
