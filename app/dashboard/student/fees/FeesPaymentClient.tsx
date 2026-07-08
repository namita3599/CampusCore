"use client";

import { useState, useTransition } from "react";
import { payTuition, payHostel } from "../actions";
import { Button } from "@/components/ui/button";

interface Props {
  profileId: number;
  initialTuitionPaid: boolean;
  initialHostelPaid: boolean;
  isTuitionLocked: boolean;
  tuitionAmount: number;
  hostelAmount: number;
  tuitionTerm: string;
  hostelTerm: string;
}

export default function FeesPaymentClient({
  profileId,
  initialTuitionPaid,
  initialHostelPaid,
  isTuitionLocked,
  tuitionAmount,
  hostelAmount,
  tuitionTerm,
  hostelTerm,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [tuitionPaid, setTuitionPaid] = useState(initialTuitionPaid);
  const [hostelPaid, setHostelPaid] = useState(initialHostelPaid);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handlePayTuition = () => {
    if (isTuitionLocked) {
      showMsg("error", "Tuition fee payments have been locked by the administrator.");
      return;
    }
    startTransition(async () => {
      try {
        await payTuition(profileId);
        showMsg("success", "Tuition fee paid successfully!");
        setTuitionPaid(true);
      } catch (e: any) {
        showMsg("error", e.message || "Tuition payment failed.");
      }
    });
  };

  const handlePayHostel = () => {
    startTransition(async () => {
      try {
        await payHostel(profileId);
        showMsg("success", "Hostel fee paid successfully!");
        setHostelPaid(true);
      } catch (e: any) {
        showMsg("error", e.message || "Hostel payment failed.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          message.type === "success"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-red-50 text-red-700 border-red-200"
        }`}>
          {message.type === "success" ? "✅" : "❌"} {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tuition Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">💳</span>
                <h3 className="font-semibold text-zinc-950">Tuition Fee</h3>
              </div>
              {tuitionPaid ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  ✓ Paid
                </span>
              ) : isTuitionLocked ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1">
                  🔒 Locked
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  ⏳ Outstanding
                </span>
              )}
            </div>

            <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-4">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Amount Due</p>
              <p className="text-3xl font-extrabold text-zinc-950 mt-1">₹{tuitionAmount.toLocaleString("en-IN")}</p>
              <p className="text-xs text-zinc-400 mt-1.5">{tuitionTerm}</p>
            </div>
            {isTuitionLocked && !tuitionPaid && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
                ⚠️ Tuition fee payments have been temporarily disabled/stopped by the administrator. Contact administration.
              </p>
            )}
            <p className="text-xs text-zinc-500">Includes core academic facilities, examinations, and laboratory fees.</p>
          </div>

          <Button
            onClick={handlePayTuition}
            disabled={isPending || tuitionPaid || isTuitionLocked}
            className={`w-full rounded-xl py-3 ${
              tuitionPaid
                ? "bg-zinc-100 border border-zinc-200 text-zinc-400 cursor-not-allowed hover:bg-zinc-100"
                : isTuitionLocked
                ? "bg-zinc-100 border border-zinc-200 text-zinc-400 cursor-not-allowed hover:bg-zinc-100"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
            suppressHydrationWarning
          >
            {tuitionPaid ? "Tuition Fees Settled" : isTuitionLocked ? "Tuition Payments Locked" : "Pay Tuition Fee"}
          </Button>
        </div>

        {/* Hostel Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏠</span>
                <h3 className="font-semibold text-zinc-950">Hostel Fee</h3>
              </div>
              {hostelPaid ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  ✓ Paid
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  ⏳ Outstanding
                </span>
              )}
            </div>

            <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-4">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Amount Due</p>
              <p className="text-3xl font-extrabold text-zinc-950 mt-1">₹{hostelAmount.toLocaleString("en-IN")}</p>
              <p className="text-xs text-zinc-400 mt-1.5">{hostelTerm}</p>
            </div>
            <p className="text-xs text-zinc-500">Covers hostel room allotment, daily breakfast/lunch/dinner, power, and water utilities.</p>
          </div>

          <Button
            onClick={handlePayHostel}
            disabled={isPending || hostelPaid}
            className={`w-full rounded-xl py-3 ${
              hostelPaid
                ? "bg-zinc-100 border border-zinc-200 text-zinc-400 cursor-not-allowed hover:bg-zinc-100"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
            suppressHydrationWarning
          >
            {hostelPaid ? "Hostel Fees Settled" : "Pay Hostel Fee"}
          </Button>
        </div>
      </div>
    </div>
  );
}
