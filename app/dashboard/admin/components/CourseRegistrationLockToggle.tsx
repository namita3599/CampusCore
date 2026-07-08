"use client";

import { useState, useTransition } from "react";
import { toggleCourseRegistrationLock, toggleTuitionPaymentLock } from "../actions";

interface Props {
  initialLocked: boolean;
  initialTuitionLocked: boolean;
}

export default function CourseRegistrationLockToggle({
  initialLocked,
  initialTuitionLocked,
}: Props) {
  const [locked, setLocked] = useState(initialLocked);
  const [tuitionLocked, setTuitionLocked] = useState(initialTuitionLocked);
  const [isPendingReg, startTransitionReg] = useTransition();
  const [isPendingTuition, startTransitionTuition] = useTransition();

  const handleToggleReg = () => {
    const nextState = !locked;
    startTransitionReg(async () => {
      try {
        await toggleCourseRegistrationLock(nextState);
        setLocked(nextState);
      } catch (err: any) {
        console.error("Failed to toggle registration lock:", err);
      }
    });
  };

  const handleToggleTuition = () => {
    const nextState = !tuitionLocked;
    startTransitionTuition(async () => {
      try {
        await toggleTuitionPaymentLock(nextState);
        setTuitionLocked(nextState);
      } catch (err: any) {
        console.error("Failed to toggle tuition lock:", err);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Course Registration Lock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{locked ? "🔒" : "🔓"}</span>
            <h3 className="font-semibold text-zinc-900 text-sm">
              Course Registration: {locked ? "Locked" : "Open"}
            </h3>
          </div>
          <p className="text-xs text-zinc-500 max-w-sm">
            {locked
              ? "Students are currently blocked from registering or modifying their semester courses."
              : "Students can register for subjects and edit their selections from their dashboards."}
          </p>
        </div>

        <button
          onClick={handleToggleReg}
          disabled={isPendingReg}
          className={`inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 ${
            locked
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/50"
              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/50"
          } disabled:opacity-60 shrink-0`}
        >
          {isPendingReg
            ? "Processing..."
            : locked
            ? "Unlock Registration"
            : "Lock Registration"}
        </button>
      </div>

      {/* Tuition Fee Lock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{tuitionLocked ? "🔒" : "🔓"}</span>
            <h3 className="font-semibold text-zinc-900 text-sm">
              Tuition Fee Payments: {tuitionLocked ? "Stopped" : "Active"}
            </h3>
          </div>
          <p className="text-xs text-zinc-500 max-w-sm">
            {tuitionLocked
              ? "Tuition payment portal is disabled. Students cannot pay semester tuition fees."
              : "Students can clear their outstanding tuition fees from their fee dashboards."}
          </p>
        </div>

        <button
          onClick={handleToggleTuition}
          disabled={isPendingTuition}
          className={`inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 ${
            tuitionLocked
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/50"
              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/50"
          } disabled:opacity-60 shrink-0`}
        >
          {isPendingTuition
            ? "Processing..."
            : tuitionLocked
            ? "Enable Payments"
            : "Stop Payments"}
        </button>
      </div>
    </div>
  );
}
