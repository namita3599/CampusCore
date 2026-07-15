"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

// ─── Shared helper: create a Nodemailer transporter ──────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// ─── ACTION 1: Request OTP ────────────────────────────────────────────────────
/**
 * Generates a 6-digit OTP for the given email, bcrypt-hashes it, persists it to
 * the DB, and sends it via Nodemailer.
 *
 * Rate-limited: one request per 60 seconds per account.
 */
export async function requestPasswordResetOtp(
  email: string
): Promise<{ success: boolean; message: string }> {
  if (!email?.trim()) {
    return { success: false, message: "Email is required." };
  }

  // 1. Look up the user by email (globally unique index)
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      email: true,
      username: true,
      lastOtpRequestedAt: true,
    },
  });

  // Return a generic message to avoid user enumeration
  if (!user || !user.email) {
    return {
      success: true,
      message: "If that email is registered, you will receive an OTP shortly.",
    };
  }

  // 2. Rate-limit: reject if last OTP was requested < 60 seconds ago
  if (user.lastOtpRequestedAt) {
    const secondsSinceLastRequest =
      (Date.now() - user.lastOtpRequestedAt.getTime()) / 1000;
    if (secondsSinceLastRequest < 60) {
      const remaining = Math.ceil(60 - secondsSinceLastRequest);
      return {
        success: false,
        message: `Please wait ${remaining} second${remaining !== 1 ? "s" : ""} before requesting another OTP.`,
      };
    }
  }

  // 3. Generate 6-digit numeric OTP
  const rawOtp = String(Math.floor(100000 + Math.random() * 900000));

  // 4. Hash the OTP (cost factor 10 is fast enough for a short-lived token)
  const otpHash = await bcrypt.hash(rawOtp, 10);

  // 5. Persist: hash, expiry (10 min), reset failed attempts, update request timestamp
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // NOW + 10 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpHash,
      otpExpiresAt,
      failedOtpAttempts: 0,
      lastOtpRequestedAt: new Date(),
    },
  });

  // 6. Send OTP via Nodemailer
  const transporter = createTransporter();

  await new Promise<void>((resolve, reject) => {
    transporter.verify((err) => (err ? reject(err) : resolve()));
  });

  await transporter.sendMail({
    from: `"CampusCore" <${process.env.EMAIL_USER}>`,
    to: user.email!,
    subject: "CampusCore - Your Password Reset OTP",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#111827;margin-bottom:8px;">Password Reset Request</h2>
        <p style="color:#6b7280;">We received a request to reset the password for the account associated with this email address.</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:24px;margin:24px 0;text-align:center;">
          <p style="margin:0 0 8px;color:#374151;font-size:14px;">Your One-Time Password (OTP)</p>
          <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:0.3em;color:#111827;">${rawOtp}</p>
        </div>
        <p style="color:#ef4444;font-size:14px;">This OTP expires in <strong>10 minutes</strong> and can only be used once.</p>
        <p style="color:#6b7280;font-size:13px;margin-top:16px;">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#9ca3af;font-size:12px;">CampusCore - Campus Management System</p>
      </div>
    `,
  });

  return {
    success: true,
    message: "If that email is registered, you will receive an OTP shortly.",
  };
}

// ─── ACTION 2: Verify OTP and Reset Password ──────────────────────────────────
/**
 * Validates the submitted OTP against the stored hash and, on success, resets
 * the user's password and clears all OTP fields atomically.
 *
 * Guards:
 *  - OTP must not be expired.
 *  - Max 3 failed attempts before OTP is invalidated.
 */
export async function verifyOtpAndResetPassword(
  email: string,
  rawOtp: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  // Input validation
  if (!email?.trim() || !rawOtp?.trim() || !newPassword) {
    return { success: false, message: "All fields are required." };
  }

  if (rawOtp.trim().length !== 6 || !/^\d{6}$/.test(rawOtp.trim())) {
    return { success: false, message: "OTP must be a 6-digit number." };
  }

  // Password strength (same rules as changePasswordForcefully)
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const hasSpecial = /[^A-Za-z\d]/.test(newPassword);

  if (!hasMinLength || !hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
    return {
      success: false,
      message:
        "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.",
    };
  }

  // Fetch user by email (globally unique index)
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      otpHash: true,
      otpExpiresAt: true,
      failedOtpAttempts: true,
    },
  });

  // Generic error to prevent user enumeration
  if (!user) {
    return { success: false, message: "Invalid or expired OTP." };
  }

  // Guard 1: OTP must exist and not be expired
  if (!user.otpHash || !user.otpExpiresAt) {
    return { success: false, message: "No active OTP found. Please request a new one." };
  }

  if (new Date() > user.otpExpiresAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { otpHash: null, otpExpiresAt: null, failedOtpAttempts: 0 },
    });
    return { success: false, message: "OTP has expired. Please request a new one." };
  }

  // Guard 2: Max 3 failed attempts
  if (user.failedOtpAttempts >= 3) {
    await prisma.user.update({
      where: { id: user.id },
      data: { otpHash: null, otpExpiresAt: null, failedOtpAttempts: 0 },
    });
    return {
      success: false,
      message:
        "Too many failed attempts. Your OTP has been invalidated. Please request a new one.",
    };
  }

  // Verify OTP
  const isValid = await bcrypt.compare(rawOtp.trim(), user.otpHash);

  if (!isValid) {
    const newFailedCount = user.failedOtpAttempts + 1;
    const remainingAttempts = 3 - newFailedCount;

    if (remainingAttempts <= 0) {
      // 3rd failure: clear OTP immediately
      await prisma.user.update({
        where: { id: user.id },
        data: { otpHash: null, otpExpiresAt: null, failedOtpAttempts: 0 },
      });
      return {
        success: false,
        message:
          "Incorrect OTP. Too many failed attempts - OTP invalidated. Please request a new one.",
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedOtpAttempts: newFailedCount },
    });

    return {
      success: false,
      message: `Incorrect OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? "s" : ""} remaining.`,
    };
  }

  // OTP is valid: hash new password and save atomically, clear all OTP fields
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      hashedPassword,
      // Clear all OTP fields to prevent replay attacks
      otpHash: null,
      otpExpiresAt: null,
      failedOtpAttempts: 0,
      // Satisfy force-change requirement since user proved identity via OTP
      forcePasswordChange: false,
    },
  });

  return { success: true, message: "Password reset successfully. You can now log in." };
}
