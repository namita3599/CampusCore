"use server";

import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";

// ─── Create Student ──────────────────────────────────────────
export async function createStudent(formData: FormData) {
  const name         = formData.get("name")            as string;
  const branch       = formData.get("branch")          as string;
  const rollNumber   = formData.get("rollNumber")      as string;
  const phone        = formData.get("phone")           as string;
  const guardianName = formData.get("guardianName")    as string;
  const yearOfAdmission = formData.get("yearOfAdmission") as string;
  const bloodGroup   = formData.get("bloodGroup")      as string;
  const email        = formData.get("email")           as string;

  if (!name || !branch || !rollNumber || !phone || !guardianName || !yearOfAdmission || !email) {
    throw new Error("All fields are required.");
  }

  const username     = (branch.substring(0, 2) + rollNumber).toLowerCase();
  const admissionYear = Number(yearOfAdmission);

  if (!Number.isInteger(admissionYear) || admissionYear < 2000 || admissionYear > 2100) {
    throw new Error("Year of admission must be a valid year.");
  }

  // Generate a secure 8-character random password
  const tempPassword = randomBytes(4).toString("hex");
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  await prisma.$transaction(async (tx) => {
    const duplicateRoll = await tx.studentProfile.findFirst({ where: { rollNumber } });
    if (duplicateRoll) throw new Error(`Roll number ${rollNumber} is already registered.`);

    const duplicateUsername = await tx.user.findUnique({ where: { username } });
    if (duplicateUsername) throw new Error(`Generated username ${username} already exists.`);

    const duplicateEmail = await tx.user.findUnique({ where: { email } });
    if (duplicateEmail) throw new Error(`Email ${email} is already registered.`);

    await tx.user.create({
      data: {
        username,
        email,
        hashedPassword,
        role: Role.STUDENT,
        forcePasswordChange: true,
        studentProfile: {
          create: {
            name,
            branch,
            rollNumber,
            phone,
            guardianName,
            yearOfAdmission: admissionYear,
            ...(bloodGroup ? { bloodGroup } : {}),
          },
        },
      },
    });
  });

  // ─── Send credentials via Nodemailer (Vercel-safe) ────────────
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await new Promise<void>((resolve, reject) => {
    transporter.verify((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  await new Promise<void>((resolve, reject) => {
    transporter.sendMail(
      {
        from: `"CampusCore" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your CampusCore Account Credentials",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
            <h2 style="color:#111827;margin-bottom:8px;">Welcome to CampusCore &#127891;</h2>
            <p style="color:#6b7280;">Your student account has been created. Use the credentials below to log in.</p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:24px 0;">
              <p style="margin:0 0 8px;"><strong>Username:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${username}</code></p>
              <p style="margin:0;"><strong>Temporary Password:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
            </div>
            <p style="color:#ef4444;font-size:14px;">&#9888;&#65039; You will be required to change your password on first login.</p>
            <p style="color:#6b7280;font-size:13px;margin-top:24px;">If you did not expect this email, contact your campus administrator.</p>
          </div>
        `,
      },
      (error) => {
        if (error) reject(error);
        else resolve();
      }
    );
  });

  revalidatePath("/dashboard/admin");
}

// ─── Create Teacher ──────────────────────────────────────────
export async function createTeacher(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const subjectId = formData.get("subjectId") as string;

  if (!username || !password || !name) {
    throw new Error("All fields are required.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      username,
      hashedPassword,
      role: Role.TEACHER,
      teacherProfile: {
        create: {
          name,
          ...(subjectId ? { subject: { connect: { id: parseInt(subjectId) } } } : {}),
        },
      },
    },
  });

  revalidatePath("/dashboard/admin");
}

// ─── Create Warden ───────────────────────────────────────────
export async function createWarden(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const hostelId = formData.get("hostelId") as string;

  if (!username || !password || !name) {
    throw new Error("All fields are required.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      username,
      hashedPassword,
      role: Role.WARDEN,
      wardenProfile: {
        create: {
          name,
          ...(hostelId ? { hostel: { connect: { id: parseInt(hostelId) } } } : {}),
        },
      },
    },
  });

  revalidatePath("/dashboard/admin");
}

// ─── Create Subject ──────────────────────────────────────────
export async function createSubject(formData: FormData) {
  const name = formData.get("subjectName") as string;
  if (!name) throw new Error("Subject name is required.");

  await prisma.subject.create({ data: { name } });
  revalidatePath("/dashboard/admin");
}

// ─── Create Hostel ───────────────────────────────────────────
export async function createHostel(formData: FormData) {
  const name = formData.get("hostelName") as string;
  if (!name) throw new Error("Hostel name is required.");

  await prisma.hostel.create({ data: { name } });
  revalidatePath("/dashboard/admin");
}

// ─── Assign Subject to Teacher ───────────────────────────────
export async function assignSubjectToTeacher(formData: FormData) {
  const teacherProfileId = parseInt(formData.get("teacherProfileId") as string);
  const subjectId = parseInt(formData.get("subjectId") as string);

  await prisma.subject.update({
    where: { id: subjectId },
    data: { teacherId: teacherProfileId },
  });

  revalidatePath("/dashboard/admin");
}

// ─── Assign Hostel to Warden ─────────────────────────────────
export async function assignHostelToWarden(formData: FormData) {
  const wardenProfileId = parseInt(formData.get("wardenProfileId") as string);
  const hostelId = parseInt(formData.get("hostelId") as string);

  await prisma.hostel.update({
    where: { id: hostelId },
    data: { wardenId: wardenProfileId },
  });

  revalidatePath("/dashboard/admin");
}

// ─── Assign Student to Hostel ─────────────────────────────────
export async function assignStudentToHostel(formData: FormData) {
  const studentId = parseInt(formData.get("studentId") as string);
  const hostelId = parseInt(formData.get("hostelId") as string);

  await prisma.studentHostel.upsert({
    where: { studentId_hostelId: { studentId, hostelId } },
    update: {},
    create: { studentId, hostelId },
  });

  revalidatePath("/dashboard/admin");
}
