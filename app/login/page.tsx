"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import {
  requestPasswordResetOtp,
  verifyOtpAndResetPassword,
} from "@/app/actions/password-reset";

const roleOptions = [
  { value: "ADMIN", label: "Admin" },
  { value: "STUDENT", label: "Student" },
  { value: "TEACHER", label: "Teacher" },
  { value: "WARDEN", label: "Warden" },
];

const roleDashboardMap: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  STUDENT: "/dashboard/student",
  TEACHER: "/dashboard/teacher",
  WARDEN: "/dashboard/warden",
};

// â”€â”€ Eye icon helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

export default function LoginPage() {
  const router = useRouter();

  // â”€â”€ Login form state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [role, setRole] = useState("ADMIN");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // â”€â”€ Forgot-password modal state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [showForgotModal, setShowForgotModal] = useState(false);
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

  function openForgotModal() {
    setFpStep("email");
    setFpEmail("");
    setFpOtp("");
    setFpNewPassword("");
    setFpConfirmPassword("");
    setFpError("");
    setFpSuccess("");
    setResendCooldown(0);
    setShowForgotModal(true);
  }

  function closeForgotModal() {
    setShowForgotModal(false);
  }

  // â”€â”€ Login submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      role,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid credentials or role mismatch. Please try again.");
    } else {
      router.push(roleDashboardMap[role]);
      router.refresh();
    }
  };

  // â”€â”€ Forgot password: Step 1 â€” Request OTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError("");
    if (!fpEmail.trim()) { setFpError("Please enter your email address."); return; }

    setFpLoading(true);
    const res = await requestPasswordResetOtp(fpEmail.trim());
    setFpLoading(false);

    if (!res.success) {
      setFpError(res.message);
      return;
    }

    // Always advance to OTP step (generic message prevents enumeration)
    startCooldown();
    setFpSuccess(res.message);
    setFpStep("otp");
  };

  // â”€â”€ Forgot password: Resend OTP (from step 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Forgot password: Step 2 â€” Verify OTP & reset â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError("");

    if (fpNewPassword !== fpConfirmPassword) {
      setFpError("Passwords do not match.");
      return;
    }

    setFpLoading(true);
    const res = await verifyOtpAndResetPassword(fpEmail.trim(), fpOtp.trim(), fpNewPassword);
    setFpLoading(false);

    if (!res.success) {
      setFpError(res.message);
      return;
    }

    setFpStep("success");
  };

  // â”€â”€ Step indicator labels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const steps = [
    { key: "email", label: "Email" },
    { key: "otp",   label: "Verify" },
    { key: "success", label: "Done" },
  ] as const;
  const currentStepIndex = steps.findIndex((s) => s.key === fpStep);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">

          {/* Left Branding Section */}
          <section className="flex flex-col justify-center">
            <div className="max-w-xl space-y-8">
              {/* Logo and Headings */}
              <div className="space-y-4">
                <img src="/logo.png" alt="CampusCore Logo" className="w-80 sm:w-96 h-auto object-contain dark:invert" />

                <p className="max-w-xl text-lg leading-7 text-zinc-600">
                  Unifying campus administration, faculty workflows, and student housing in one secure digital workspace.
                </p>
              </div>

              {/* Feature Grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Centralized Academic Records",
                  "Faculty & Course Workflows",
                  "Student Housing & Residency",
                  "Automated Fee Management",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 shadow-sm">
                    <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Right Login Card */}
          <Card className="self-center border-zinc-200 bg-white shadow-sm">
            <CardHeader className="space-y-2 p-8 pb-6">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription className="text-base">
                Select your role and enter your institutional credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">

              {/* Error Alert */}
              {error ? (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              ) : null}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <Tabs value={role} onValueChange={setRole}>
                  <div className="space-y-3">
                    <Label className="text-zinc-700">Account Role</Label>
                    <TabsList className="grid h-auto w-full grid-cols-4 gap-1 bg-zinc-100/80 p-1">
                      {roleOptions.map((opt) => (
                        <TabsTrigger key={opt.value} value={opt.value} className="h-9 text-xs sm:text-sm data-[state=active]:shadow-sm">
                          {opt.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                </Tabs>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    required
                    className="focus-visible:ring-zinc-900"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={openForgotModal}
                      className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline transition-colors"
                      id="forgot-password-btn"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="pr-10 focus-visible:ring-zinc-900"
                    />
                    <Button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md border-0 bg-transparent p-0 text-zinc-500 shadow-none hover:bg-zinc-100 hover:text-zinc-900"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeOpenIcon />}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-md bg-zinc-900 text-white shadow-sm transition-colors hover:bg-zinc-800"
                >
                  {loading ? "Authenticating..." : "Sign in to Dashboard"}
                </Button>
              </form>

              {/* Sandbox Access Box */}
              <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sandbox Environment Access
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <p><span className="font-medium text-slate-900">Admin:</span> admin / adminPassword123</p>
                  <p><span className="font-medium text-slate-900">Student:</span> student_alice / student123</p>
                  <p><span className="font-medium text-slate-900">Teacher:</span> teacher_john / teacher123</p>
                  <p><span className="font-medium text-slate-900">Warden:</span> warden_mary / warden123</p>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>

      {/* â”€â”€ Forgot Password Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Reset password"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
              <div>
                <h2 className="text-lg font-bold text-zinc-950">Reset Password</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {fpStep === "email" && "Enter your registered email to receive a one-time code."}
                  {fpStep === "otp"   && `Enter the 6-digit OTP sent to ${fpEmail}.`}
                  {fpStep === "success" && "Your password has been updated."}
                </p>
              </div>
              {fpStep !== "success" && (
                <button
                  onClick={closeForgotModal}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-0 px-6 pt-4">
              {steps.map((step, i) => (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        i < currentStepIndex
                          ? "bg-zinc-900 text-white"
                          : i === currentStepIndex
                          ? "bg-zinc-900 text-white ring-4 ring-zinc-200"
                          : "bg-zinc-100 text-zinc-400"
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
                    <span className={`text-[10px] font-medium ${i === currentStepIndex ? "text-zinc-900" : "text-zinc-400"}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-colors ${i < currentStepIndex ? "bg-zinc-900" : "bg-zinc-200"}`} />
                  )}
                </div>
              ))}
            </div>

            <div className="px-6 pb-6 pt-2">

              {/* Error / Success banners */}
              {fpError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {fpError}
                </div>
              )}
              {fpSuccess && !fpError && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {fpSuccess}
                </div>
              )}

              {/* â”€â”€ STEP 1: Enter email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {fpStep === "email" && (
                <form onSubmit={handleRequestOtp} className="space-y-4 mt-4">
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
                      className="focus-visible:ring-zinc-900"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={fpLoading}
                    className="h-11 w-full rounded-md bg-zinc-900 text-white hover:bg-zinc-800"
                  >
                    {fpLoading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    className="w-full text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
                  >
                    Back to login
                  </button>
                </form>
              )}

              {/* â”€â”€ STEP 2: OTP + new password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {fpStep === "otp" && (
                <form onSubmit={handleVerifyAndReset} className="space-y-4 mt-4">
                  {/* OTP input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="fp-otp">6-Digit OTP</Label>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendCooldown > 0 || fpLoading}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                      className="tracking-[0.5em] text-center text-lg font-bold focus-visible:ring-zinc-900"
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
                        placeholder="Min 8 chars, upper, lower, number, symbol"
                        required
                        className="pr-10 focus-visible:ring-zinc-900"
                      />
                      <Button
                        type="button"
                        onClick={() => setFpShowNew((v) => !v)}
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md border-0 bg-transparent p-0 text-zinc-500 shadow-none hover:bg-zinc-100 hover:text-zinc-900"
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
                        className={`pr-10 focus-visible:ring-zinc-900 ${
                          fpConfirmPassword && fpNewPassword !== fpConfirmPassword
                            ? "border-red-300 focus-visible:ring-red-400"
                            : ""
                        }`}
                      />
                      <Button
                        type="button"
                        onClick={() => setFpShowConfirm((v) => !v)}
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md border-0 bg-transparent p-0 text-zinc-500 shadow-none hover:bg-zinc-100 hover:text-zinc-900"
                        aria-label={fpShowConfirm ? "Hide password" : "Show password"}
                      >
                        {fpShowConfirm ? <EyeOffIcon /> : <EyeOpenIcon />}
                      </Button>
                    </div>
                    {fpConfirmPassword && fpNewPassword !== fpConfirmPassword && (
                      <p className="text-xs text-red-500">Passwords do not match.</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={fpLoading || (!!fpConfirmPassword && fpNewPassword !== fpConfirmPassword)}
                    className="h-11 w-full rounded-md bg-zinc-900 text-white hover:bg-zinc-800"
                  >
                    {fpLoading ? "Verifying..." : "Reset Password"}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setFpStep("email"); setFpError(""); setFpSuccess(""); }}
                    className="w-full text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
                  >
                    &larr; Change email
                  </button>
                </form>
              )}

              {/* â”€â”€ STEP 3: Success â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {fpStep === "success" && (
                <div className="mt-6 flex flex-col items-center gap-5 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-zinc-950">Password Updated!</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Your password has been reset successfully. You can now sign in with your new credentials.
                    </p>
                  </div>
                  <Button
                    onClick={closeForgotModal}
                    className="h-11 w-full rounded-md bg-zinc-900 text-white hover:bg-zinc-800"
                  >
                    Back to Login
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

