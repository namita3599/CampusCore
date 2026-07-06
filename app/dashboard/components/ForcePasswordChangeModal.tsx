"use client";

import { useState, useTransition } from "react";
import { changePasswordForcefully } from "../actions";

interface Props {
  userId: number;
  username: string;
}

export default function ForcePasswordChangeModal({ userId, username }: Props) {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPass !== confirmPass) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    if (newPass.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }

    if (currentPass === newPass) {
      setErrorMsg("New password cannot be the same as your temporary password.");
      return;
    }

    startTransition(async () => {
      try {
        await changePasswordForcefully(userId, currentPass, newPass);
        setSuccessMsg("Password changed successfully! Redirecting...");
        // Re-auth state update will occur on reload
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to update password. Please check your credentials.");
      }
    });
  };

  const inputCls =
    "w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all pr-10";
  const labelCls = "block text-sm font-medium text-zinc-700 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-md select-none pointer-events-auto">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-2xl animate-fadeInUp space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 text-2xl font-bold animate-pulse">
            🔒
          </div>
          <h3 className="text-xl font-bold text-zinc-950">Security Setup Required</h3>
          <p className="text-sm text-zinc-500">
            Welcome back, <span className="font-semibold text-zinc-800">{username}</span>. As this is your first login, you must secure your account with a new password before proceeding.
          </p>
        </div>

        {/* Message banners */}
        {errorMsg && (
          <div className="px-4 py-2.5 rounded-xl text-xs font-medium border bg-rose-50 text-rose-700 border-rose-200">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="px-4 py-2.5 rounded-xl text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Temporary Password */}
          <div>
            <label className={labelCls}>Current Temporary Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="Enter temporary password from email"
                required
                disabled={isPending}
                className={inputCls}
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
                suppressHydrationWarning
              >
                {showCurrent ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className={labelCls}>New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                disabled={isPending}
                className={inputCls}
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
                suppressHydrationWarning
              >
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className={labelCls}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Re-enter your new password"
              required
              disabled={isPending}
              className={inputCls}
              suppressHydrationWarning
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
            suppressHydrationWarning
          >
            {isPending ? "Updating Security Settings..." : "Save Password & Proceed"}
          </button>
        </form>
      </div>
    </div>
  );
}
