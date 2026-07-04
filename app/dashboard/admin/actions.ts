"use server";

import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

// ─── Create Student ──────────────────────────────────────────
export async function createStudent(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const branch = formData.get("branch") as string;

  if (!username || !password || !name || !branch) {
    throw new Error("All fields are required.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      username,
      hashedPassword,
      role: Role.STUDENT,
      studentProfile: {
        create: { name, branch },
      },
    },
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
