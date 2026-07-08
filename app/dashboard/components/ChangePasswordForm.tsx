"use client";

import { useState, useTransition } from "react";
import { changePasswordSelf } from "../actions";
import { KeyRound, X, ShieldAlert } from "lucide-react";

interface Props {
  userId: number;
}

export default function ChangePasswordForm({ userId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
    setCurrentPass("");
    setNewPass("");
    setConfirmPass("");
    setMessage(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    if (newPass !== confirmPass) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    const hasMinLength = newPass.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPass);
    const hasLowercase = /[a-z]/.test(newPass);
    const hasDigit = /\d/.test(newPass);
    const hasSpecial = /[^A-Za-z\d]/.test(newPass);

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
      setMessage({
        type: "error",
        text: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
      });
      return;
    }

    // Ask for confirmation before changing
    const confirmed = window.confirm("Are you sure you want to change your password?");
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await changePasswordSelf(userId, currentPass, newPass);
        setMessage({ type: "success", text: "Password updated successfully!" });
        setCurrentPass("");
        setNewPass("");
        setConfirmPass("");
        // Auto close on success after a delay
        setTimeout(() => {
          handleClose();
        }, 1500);
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to update password." });
      }
    });
  };

  const inputCls =
    "w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all pr-10";
  const labelCls = "block text-xs font-semibold text-zinc-500 mb-1";

  return (
    <>
      {/* Small Lock/Security Icon Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Change Password"
        className="p-1.5 rounded-lg border border-zinc-200 hover:border-zinc-400 text-zinc-500 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 transition-all duration-200"
      >
        <KeyRound className="w-4 h-4" />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm animate-fadeIn">
          {/* Modal Box */}
          <div className="w-full max-w-sm rounded-2xl border border-zinc-250 bg-white p-6 shadow-2xl animate-scaleUp space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="text-zinc-800"><KeyRound className="w-4.5 h-4.5" /></span>
                <h3 className="font-bold text-zinc-900 text-sm">Change Password</h3>
              </div>
              <button
                onClick={handleClose}
                className="text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {message && (
                <div className={`p-3 rounded-xl text-xs font-medium border leading-relaxed ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {message.text}
                </div>
              )}

              {/* Current Password */}
              <div>
                <label className={labelCls}>Old Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="Enter old password"
                    required
                    disabled={isPending}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 text-xs transition-colors"
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
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 text-xs transition-colors"
                  >
                    {showNew ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className={labelCls}>Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    disabled={isPending}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 text-xs transition-colors"
                  >
                    {showConfirm ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 transition-colors"
                >
                  {isPending ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
