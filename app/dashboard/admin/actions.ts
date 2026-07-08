"use server";

import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";

// ─── Create Student ──────────────────────────────────────────
export async function createStudent(formData: FormData) {
  const name = formData.get("name") as string;
  const branch = formData.get("branch") as string;
  const rollNumber = formData.get("rollNumber") as string;
  const phone = formData.get("phone") as string;
  const guardianName = formData.get("guardianName") as string;
  const yearOfAdmission = formData.get("yearOfAdmission") as string;
  const bloodGroup = formData.get("bloodGroup") as string;
  const email = formData.get("email") as string;

  if (!name || !branch || !rollNumber || !phone || !guardianName || !yearOfAdmission || !email) {
    throw new Error("All fields are required.");
  }

  const username = (branch.substring(0, 2) + rollNumber).toLowerCase();
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
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const subjectId = formData.get("subjectId") as string;

  if (!name || !phone || !email) {
    throw new Error("All fields are required.");
  }

  // Generate username: first word of name + 4 random hex chars
  const baseUsername = name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
  const suffix = randomBytes(2).toString("hex");
  const username = `${baseUsername}_${suffix}`;

  const tempPassword = randomBytes(4).toString("hex");
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  await prisma.$transaction(async (tx) => {
    const duplicateEmail = await tx.user.findUnique({ where: { email } });
    if (duplicateEmail) throw new Error(`Email ${email} is already registered.`);

    const duplicateUsername = await tx.user.findUnique({ where: { username } });
    if (duplicateUsername) throw new Error(`Generated username ${username} already exists. Please try again.`);

    await tx.user.create({
      data: {
        username,
        email,
        hashedPassword,
        role: Role.TEACHER,
        forcePasswordChange: true,
        teacherProfile: {
          create: {
            name,
            phone,
            ...(subjectId ? { subjects: { connect: [{ id: parseInt(subjectId) }] } } : {}),
          },
        },
      },
    });
  });

  // ─── Send credentials via email ───────────────────────────────
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  await new Promise<void>((resolve, reject) => {
    transporter.verify((error) => { if (error) reject(error); else resolve(); });
  });

  await new Promise<void>((resolve, reject) => {
    transporter.sendMail(
      {
        from: `"CampusCore" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your CampusCore Teacher Account Credentials",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
            <h2 style="color:#111827;margin-bottom:8px;">Welcome to CampusCore &#127891;</h2>
            <p style="color:#6b7280;">Your teacher account has been created. Use the credentials below to log in.</p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:24px 0;">
              <p style="margin:0 0 8px;"><strong>Username:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${username}</code></p>
              <p style="margin:0;"><strong>Temporary Password:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
            </div>
            <p style="color:#ef4444;font-size:14px;">&#9888;&#65039; You will be required to change your password on first login.</p>
            <p style="color:#6b7280;font-size:13px;margin-top:24px;">If you did not expect this email, contact your campus administrator.</p>
          </div>
        `,
      },
      (error) => { if (error) reject(error); else resolve(); }
    );
  });

  revalidatePath("/dashboard/admin");
}

// ─── Create Warden ───────────────────────────────────────────
export async function createWarden(formData: FormData) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const hostelId = formData.get("hostelId") as string;

  if (!name || !phone || !email) {
    throw new Error("All fields are required.");
  }

  // Generate username: first word of name + 4 random hex chars
  const baseUsername = name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
  const suffix = randomBytes(2).toString("hex");
  const username = `${baseUsername}_${suffix}`;

  const tempPassword = randomBytes(4).toString("hex");
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  await prisma.$transaction(async (tx) => {
    const duplicateEmail = await tx.user.findUnique({ where: { email } });
    if (duplicateEmail) throw new Error(`Email ${email} is already registered.`);

    const duplicateUsername = await tx.user.findUnique({ where: { username } });
    if (duplicateUsername) throw new Error(`Generated username ${username} already exists. Please try again.`);

    await tx.user.create({
      data: {
        username,
        email,
        hashedPassword,
        role: Role.WARDEN,
        forcePasswordChange: true,
        wardenProfile: {
          create: {
            name,
            phone,
            ...(hostelId ? { hostels: { connect: [{ id: parseInt(hostelId) }] } } : {}),
          },
        },
      },
    });
  });

  // ─── Send credentials via email ───────────────────────────────
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  await new Promise<void>((resolve, reject) => {
    transporter.verify((error) => { if (error) reject(error); else resolve(); });
  });

  await new Promise<void>((resolve, reject) => {
    transporter.sendMail(
      {
        from: `"CampusCore" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your CampusCore Warden Account Credentials",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
            <h2 style="color:#111827;margin-bottom:8px;">Welcome to CampusCore &#127891;</h2>
            <p style="color:#6b7280;">Your warden account has been created. Use the credentials below to log in.</p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:24px 0;">
              <p style="margin:0 0 8px;"><strong>Username:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${username}</code></p>
              <p style="margin:0;"><strong>Temporary Password:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
            </div>
            <p style="color:#ef4444;font-size:14px;">&#9888;&#65039; You will be required to change your password on first login.</p>
            <p style="color:#6b7280;font-size:13px;margin-top:24px;">If you did not expect this email, contact your campus administrator.</p>
          </div>
        `,
      },
      (error) => { if (error) reject(error); else resolve(); }
    );
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

// ─── Create Announcement ──────────────────────────────────────
export async function createAnnouncement(formData: FormData) {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const targetRole = (formData.get("targetRole") as string) || "ALL";

  if (!title || !content) {
    throw new Error("Title and content are required.");
  }

  const validRoles = ["ALL", "STUDENT", "TEACHER", "WARDEN"];
  const finalRole = validRoles.includes(targetRole) ? targetRole : "ALL";

  await prisma.announcement.create({
    data: {
      title,
      content,
      targetRole: finalRole,
    },
  });

  revalidatePath("/dashboard", "layout");
}

// ─── Delete Announcement ──────────────────────────────────────
export async function deleteAnnouncement(id: number) {
  await prisma.announcement.delete({
    where: { id },
  });

  revalidatePath("/dashboard", "layout");
}

// ─── Update Student ───────────────────────────────────────────
export async function updateStudent(
  studentId: number,
  data: {
    name: string;
    guardianName: string | null;
    phone: string | null;
    email: string;
    hostelId: number | null;
  }
) {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { userId: true },
  });
  if (!profile) throw new Error("Student not found.");

  // Check email uniqueness excluding this user
  const duplicateEmail = await prisma.user.findFirst({
    where: {
      email: data.email,
      NOT: { id: profile.userId },
    },
  });
  if (duplicateEmail) throw new Error(`Email ${data.email} is already in use.`);

  await prisma.$transaction(async (tx) => {
    // Update User email
    await tx.user.update({
      where: { id: profile.userId },
      data: { email: data.email },
    });

    // Update StudentProfile fields
    await tx.studentProfile.update({
      where: { id: studentId },
      data: {
        name: data.name,
        guardianName: data.guardianName,
        phone: data.phone,
      },
    });

    // Update Hostel assignment
    await tx.studentHostel.deleteMany({
      where: { studentId },
    });

    if (data.hostelId) {
      await tx.studentHostel.create({
        data: {
          studentId,
          hostelId: data.hostelId,
        },
      });
    }
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
}

// ─── Delete Student ───────────────────────────────────────────
export async function deleteStudent(studentId: number) {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { userId: true },
  });

  if (profile) {
    await prisma.$transaction(async (tx) => {
      // Clear room bookings and holds by this student and reset status to AVAILABLE
      await tx.room.updateMany({
        where: {
          OR: [
            { heldByUserId: profile.userId },
            { bookedByUserId: profile.userId },
          ],
        },
        data: {
          heldByUserId: null,
          bookedByUserId: null,
          status: "AVAILABLE",
          holdExpiresAt: null,
        },
      });

      // Delete user (cascades to StudentProfile, StudentHostel, StudentSubject)
      await tx.user.delete({
        where: { id: profile.userId },
      });
    });
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
}

// ─── Update Teacher ───────────────────────────────────────────
export async function updateTeacher(
  teacherId: number,
  data: {
    name: string;
    username: string;
    email: string;
    phone: string | null;
    subjectIds: number[];
  }
) {
  const profile = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: { userId: true },
  });
  if (!profile) throw new Error("Teacher not found.");

  // Check username uniqueness
  const duplicateUser = await prisma.user.findFirst({
    where: {
      username: data.username,
      NOT: { id: profile.userId },
    },
  });
  if (duplicateUser) throw new Error(`Username ${data.username} is already taken.`);

  // Check email uniqueness
  const duplicateEmail = await prisma.user.findFirst({
    where: {
      email: data.email,
      NOT: { id: profile.userId },
    },
  });
  if (duplicateEmail) throw new Error(`Email ${data.email} is already in use.`);

  await prisma.$transaction(async (tx) => {
    // Update User
    await tx.user.update({
      where: { id: profile.userId },
      data: {
        username: data.username,
        email: data.email,
      },
    });

    // Update Profile
    await tx.teacherProfile.update({
      where: { id: teacherId },
      data: {
        name: data.name,
        phone: data.phone,
      },
    });

    // Update Subject Assignment
    await tx.subject.updateMany({
      where: { teacherId },
      data: { teacherId: null },
    });

    if (data.subjectIds && data.subjectIds.length > 0) {
      await tx.subject.updateMany({
        where: { id: { in: data.subjectIds } },
        data: { teacherId },
      });
    }
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
}

// ─── Delete Teacher ───────────────────────────────────────────
export async function deleteTeacher(teacherId: number) {
  const profile = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: { userId: true },
  });

  if (profile) {
    await prisma.$transaction(async (tx) => {
      // Disconnect teacher from any subjects
      await tx.subject.updateMany({
        where: { teacherId },
        data: { teacherId: null },
      });

      // Delete user (cascades to TeacherProfile)
      await tx.user.delete({
        where: { id: profile.userId },
      });
    });
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
}

// ─── Update Warden ────────────────────────────────────────────
export async function updateWarden(
  wardenId: number,
  data: {
    name: string;
    username: string;
    email: string;
    phone: string | null;
    hostelIds: number[];
  }
) {
  const profile = await prisma.wardenProfile.findUnique({
    where: { id: wardenId },
    select: { userId: true },
  });
  if (!profile) throw new Error("Warden not found.");

  // Check username uniqueness
  const duplicateUser = await prisma.user.findFirst({
    where: {
      username: data.username,
      NOT: { id: profile.userId },
    },
  });
  if (duplicateUser) throw new Error(`Username ${data.username} is already taken.`);

  // Check email uniqueness
  const duplicateEmail = await prisma.user.findFirst({
    where: {
      email: data.email,
      NOT: { id: profile.userId },
    },
  });
  if (duplicateEmail) throw new Error(`Email ${data.email} is already in use.`);

  await prisma.$transaction(async (tx) => {
    // Update User
    await tx.user.update({
      where: { id: profile.userId },
      data: {
        username: data.username,
        email: data.email,
      },
    });

    // Update Profile
    await tx.wardenProfile.update({
      where: { id: wardenId },
      data: {
        name: data.name,
        phone: data.phone,
      },
    });

    // Update Hostel Assignment
    await tx.hostel.updateMany({
      where: { wardenId },
      data: { wardenId: null },
    });

    if (data.hostelIds && data.hostelIds.length > 0) {
      await tx.hostel.updateMany({
        where: { id: { in: data.hostelIds } },
        data: { wardenId },
      });
    }
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
}

// ─── Delete Warden ────────────────────────────────────────────
export async function deleteWarden(wardenId: number) {
  const profile = await prisma.wardenProfile.findUnique({
    where: { id: wardenId },
    select: { userId: true },
  });

  if (profile) {
    await prisma.$transaction(async (tx) => {
      // Disconnect warden from any hostels
      await tx.hostel.updateMany({
        where: { wardenId },
        data: { wardenId: null },
      });

      // Delete user (cascades to WardenProfile)
      await tx.user.delete({
        where: { id: profile.userId },
      });
    });
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
}

// ─── Update Subject ───────────────────────────────────────────
export async function updateSubject(
  subjectId: number,
  data: {
    name: string;
    teacherId: number | null;
  }
) {
  await prisma.subject.update({
    where: { id: subjectId },
    data: {
      name: data.name,
      teacherId: data.teacherId,
    },
  });

  revalidatePath("/dashboard/admin/subjects");
  revalidatePath("/dashboard/admin");
}

// ─── Delete Subject ───────────────────────────────────────────
export async function deleteSubject(subjectId: number) {
  await prisma.$transaction(async (tx) => {
    // Delete all StudentSubject links
    await tx.studentSubject.deleteMany({
      where: { subjectId },
    });

    // Delete Subject
    await tx.subject.delete({
      where: { id: subjectId },
    });
  });

  revalidatePath("/dashboard/admin/subjects");
  revalidatePath("/dashboard/admin");
}

// ─── Update Hostel ────────────────────────────────────────────
export async function updateHostel(
  hostelId: number,
  data: {
    name: string;
    wardenId: number | null;
  }
) {
  await prisma.hostel.update({
    where: { id: hostelId },
    data: {
      name: data.name,
      wardenId: data.wardenId,
    },
  });

  revalidatePath("/dashboard/admin/hostels");
  revalidatePath("/dashboard/admin");
}

// ─── Delete Hostel ────────────────────────────────────────────
export async function deleteHostel(hostelId: number) {
  await prisma.$transaction(async (tx) => {
    // Delete StudentHostel links
    await tx.studentHostel.deleteMany({
      where: { hostelId },
    });

    // Delete all rooms in this hostel
    await tx.room.deleteMany({
      where: { hostelId },
    });

    // Delete Hostel
    await tx.hostel.delete({
      where: { id: hostelId },
    });
  });

  revalidatePath("/dashboard/admin/hostels");
  revalidatePath("/dashboard/admin");
}

// ─── System Settings: Course Registration Lock ───────────────
export async function getCourseRegistrationLocked(): Promise<boolean> {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
  return settings?.courseRegistrationLocked ?? false;
}

export async function toggleCourseRegistrationLock(locked: boolean) {
  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: { courseRegistrationLocked: locked },
    create: { id: 1, courseRegistrationLocked: locked },
  });
  revalidatePath("/dashboard/admin/subjects");
  revalidatePath("/dashboard/student/register");
}

export async function toggleTuitionPaymentLock(locked: boolean) {
  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: { tuitionPaymentLocked: locked },
    create: { id: 1, tuitionPaymentLocked: locked },
  });
  revalidatePath("/dashboard/admin/subjects");
  revalidatePath("/dashboard/student/fees");
}

// ─── Fee Record Actions ───────────────────────────────────────────
export async function markFeePaid(feeRecordId: number) {
  await prisma.feeRecord.update({
    where: { id: feeRecordId },
    data: { status: "PAID", paidAt: new Date() },
  });
  revalidatePath("/dashboard/admin/fees");
}

export async function resetFeeUnpaid(feeRecordId: number) {
  await prisma.feeRecord.update({
    where: { id: feeRecordId },
    data: { status: "UNPAID", paidAt: null },
  });
  revalidatePath("/dashboard/admin/fees");
}

export async function updateBatchFeeAmount(
  admissionYear: number,
  feeType: string,
  amount: number,
  term: string
) {
  await prisma.feeRecord.updateMany({
    where: { admissionYear, type: feeType as any, term },
    data: { amount },
  });
  revalidatePath("/dashboard/admin/fees");
}

export async function bulkResetFeesToUnpaid(
  feeType: string,
  term: string,
  defaultAmount: number
) {
  const students = await prisma.studentProfile.findMany({
    select: { id: true, yearOfAdmission: true },
  });

  await Promise.all(
    students.map((s) =>
      prisma.feeRecord.upsert({
        where: {
          studentId_type_term: { studentId: s.id, type: feeType as any, term },
        },
        update: { status: "UNPAID", paidAt: null },
        create: {
          studentId: s.id,
          type: feeType as any,
          status: "UNPAID",
          amount: defaultAmount,
          term,
          admissionYear: s.yearOfAdmission ?? new Date().getFullYear(),
        },
      })
    )
  );

  revalidatePath("/dashboard/admin/fees");
}
