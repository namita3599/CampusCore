"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import {
  requestPasswordResetOtp,
  verifyOtpAndResetPassword,
} from "@/app/actions/password-reset";

// ── Eye icon helpers ──────────────────────────────────────────────────────────
function EyeOpenIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.5 12s2.5-8 9.5-8 9.5 8 9.5 8-2.5 8-9.5 8-9.5-8-9.5-8Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.98 8.223A10.477 10.477 0 0 0 2.5 12s2.5 6.5 9.5 6.5c1.12 0 2.15-.14 3.08-.39" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.5 6.5 17.5 17.5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.28 4.42A10.7 10.7 0 0 1 12 4c7 0 9.5 8 9.5 8a16.607 16.607 0 0 1-3.11 4.84" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  // step: "email" | "otp" | "success"
  const [fpStep, setFpStep] = useState<"email" | "otp" | "success">("email");
  const [fpEmail, setFpEmail] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpNewPassword, setFpNewPassword] = useState("");
  const [fpConfirmPassword, setFpConfirmPassword] = useState("");
  const [fpShowNew, setFpShowNew] = useState(false);
  const [fpShowConfirm, setFpShowConfirm] = useState(false);
  const [fpError, setFpError] = useState("");
  const [fpSuccess, setFpSuccess] = useState("");
  const [fpLoading, setFpLoading] = useState(false);

  // Resend OTP cooldown (60 s)
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown() {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // Clean up interval on unmount
  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  // Forgot password: Step 1 — Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError("");
    if (!fpEmail.trim()) {
      setFpError("Please enter your email address.");
      return;
    }

    setFpLoading(true);
    const res = await requestPasswordResetOtp(fpEmail.trim());
    setFpLoading(false);

    if (!res.success) {
      setFpError(res.message);
      return;
    }

    startCooldown();
    setFpSuccess(res.message);
    setFpStep("otp");
  };

  // Forgot password: Resend OTP (from step 2)
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || fpLoading) return;
    setFpError("");
    setFpSuccess("");
    setFpLoading(true);
    const res = await requestPasswordResetOtp(fpEmail.trim());
    setFpLoading(false);

    if (!res.success) {
      setFpError(res.message);
    } else {
      startCooldown();
      setFpSuccess("A new OTP has been sent to your email.");
    }
  };

  // Forgot password: Step 2 — Verify OTP & reset
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError("");

    if (fpNewPassword !== fpConfirmPassword) {
      setFpError("Passwords do not match.");
      return;
    }

    setFpLoading(true);
    const res = await verifyOtpAndResetPassword(
      fpEmail.trim(),
      fpOtp.trim(),
      fpNewPassword
    );
    setFpLoading(false);

    if (!res.success) {
      setFpError(res.message);
      return;
    }

    setFpStep("success");
  };

  // Step indicator labels
  const steps = [
    { key: "email", label: "Email" },
    { key: "otp", label: "Verify" },
    { key: "success", label: "Done" },
  ] as const;
  const currentStepIndex = steps.findIndex((s) => s.key === fpStep);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 relative flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Link href="/login" className="mb-6">
          <img src="/logo.png" alt="CampusCore Logo" className="w-48 sm:w-56 h-auto object-contain dark:invert" />
        </Link>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl rounded-2xl">
          <CardHeader className="space-y-1 p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-xl font-bold">Reset Password</CardTitle>
            <CardDescription className="text-sm text-zinc-500 dark:text-zinc-400">
              {fpStep === "email" && "Enter your registered email to receive a password reset code."}
              {fpStep === "otp" && `Enter the 6-digit OTP code sent to your email.`}
              {fpStep === "success" && "Your password has been updated."}
            </CardDescription>
          </CardHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-0 px-6 pt-5">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      i < currentStepIndex
                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950"
                        : i === currentStepIndex
                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 ring-4 ring-zinc-200 dark:ring-zinc-800"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {i < currentStepIndex ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${i === currentStepIndex ? "text-zinc-900 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-500"}`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-colors ${i < currentStepIndex ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-800"}`} />
                )}
              </div>
            ))}
          </div>

          <CardContent className="p-6">
            {/* Error / Success banners */}
            {fpError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400" role="alert">
                {fpError}
              </div>
            )}
            {fpSuccess && !fpError && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                {fpSuccess}
              </div>
            )}

            {/* ── STEP 1: Enter email ── */}
            {fpStep === "email" && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fp-email">Email Address</Label>
                  <Input
                    id="fp-email"
                    type="email"
                    value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    required
                    className="focus-visible:ring-zinc-900 dark:bg-zinc-800"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={fpLoading}
                  className="h-11 w-full rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  {fpLoading ? "Sending OTP..." : "Send OTP"}
                </Button>
                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    &larr; Back to login
                  </Link>
                </div>
              </form>
            )}

            {/* ── STEP 2: OTP + new password ── */}
            {fpStep === "otp" && (
              <form onSubmit={handleVerifyAndReset} className="space-y-4">
                {/* OTP input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fp-otp">6-Digit OTP</Label>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || fpLoading}
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                  </div>
                  <Input
                    id="fp-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={fpOtp}
                    onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    required
                    className="tracking-[0.5em] text-center text-lg font-bold focus-visible:ring-zinc-900 dark:bg-zinc-800"
                  />
                </div>

                {/* New password */}
                <div className="space-y-2">
                  <Label htmlFor="fp-new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="fp-new-password"
                      type={fpShowNew ? "text" : "password"}
                      value={fpNewPassword}
                      onChange={(e) => setFpNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      required
                      className="pr-10 focus-visible:ring-zinc-900 dark:bg-zinc-800"
                    />
                    <Button
                      type="button"
                      onClick={() => setFpShowNew((v) => !v)}
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md border-0 bg-transparent p-0 text-zinc-500 shadow-none hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                      aria-label={fpShowNew ? "Hide password" : "Show password"}
                    >
                      {fpShowNew ? <EyeOffIcon /> : <EyeOpenIcon />}
                    </Button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="space-y-2">
                  <Label htmlFor="fp-confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="fp-confirm-password"
                      type={fpShowConfirm ? "text" : "password"}
                      value={fpConfirmPassword}
                      onChange={(e) => setFpConfirmPassword(e.target.value)}
                      placeholder="Repeat your new password"
                      required
                      className={`pr-10 focus-visible:ring-zinc-900 dark:bg-zinc-800 ${
                        fpConfirmPassword && fpNewPassword !== fpConfirmPassword
                          ? "border-red-300 dark:border-red-900 focus-visible:ring-red-400"
                          : ""
                      }`}
                    />
                    <Button
                      type="button"
                      onClick={() => setFpShowConfirm((v) => !v)}
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md border-0 bg-transparent p-0 text-zinc-500 shadow-none hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                      aria-label={fpShowConfirm ? "Hide password" : "Show password"}
                    >
                      {fpShowConfirm ? <EyeOffIcon /> : <EyeOpenIcon />}
                    </Button>
                  </div>
                  {fpConfirmPassword && fpNewPassword !== fpConfirmPassword && (
                    <p className="text-xs text-red-500 dark:text-red-400">Passwords do not match.</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={fpLoading || (!!fpConfirmPassword && fpNewPassword !== fpConfirmPassword)}
                  className="h-11 w-full rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  {fpLoading ? "Verifying..." : "Reset Password"}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFpStep("email");
                      setFpError("");
                      setFpSuccess("");
                    }}
                    className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    &larr; Change email address
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3: Success ── */}
            {fpStep === "success" && (
              <div className="mt-4 flex flex-col items-center gap-5 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
                  <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-semibold">Password Reset Successful!</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Your password has been successfully updated. You can now use your new credentials to log in.
                  </p>
                </div>
                <Link href="/login" className="w-full">
                  <Button className="h-11 w-full rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200">
                    Return to Login
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
