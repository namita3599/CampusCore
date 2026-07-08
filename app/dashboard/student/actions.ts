"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function registerSubjects(studentId: number, subjectIds: number[]) {
  if (subjectIds.length === 0) throw new Error("Select at least one subject.");

  // Guard: tuition must be paid before course registration
  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { tuitionPaid: true },
  });
  if (!profile?.tuitionPaid) {
    throw new Error("You must pay your tuition fee before registering for courses.");
  }

  // Guard: admin course registration lock
  const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
  if (settings?.courseRegistrationLocked) {
    throw new Error("Course registration has been locked by the admin. Changes are no longer allowed.");
  }

  await prisma.$transaction([
    prisma.studentSubject.deleteMany({ where: { studentId } }),
    prisma.studentSubject.createMany({
      data: subjectIds.map((subjectId) => ({ studentId, subjectId })),
      skipDuplicates: true,
    }),
    prisma.studentProfile.update({
      where: { id: studentId },
      data: { courseRegistered: true },
    }),
  ]);

  revalidatePath("/dashboard/student");
}


export async function payTuition(studentId: number) {
  // Guard: admin tuition payment lock
  const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
  if (settings?.tuitionPaymentLocked) {
    throw new Error("Tuition fee payments have been temporarily disabled/stopped by the administrator.");
  }

  const unpaidRecord = await prisma.feeRecord.findFirst({
    where: {
      studentId,
      type: "TUITION",
      status: "UNPAID",
    },
    orderBy: { createdAt: "desc" },
  });

  await prisma.$transaction([
    ...(unpaidRecord
      ? [
          prisma.feeRecord.update({
            where: { id: unpaidRecord.id },
            data: { status: "PAID", paidAt: new Date() },
          }),
        ]
      : []),
    prisma.studentProfile.update({
      where: { id: studentId },
      data: { tuitionPaid: true },
    }),
  ]);

  revalidatePath("/dashboard/student");
}

export async function payHostel(studentId: number) {
  const unpaidRecord = await prisma.feeRecord.findFirst({
    where: {
      studentId,
      type: "HOSTEL",
      status: "UNPAID",
    },
    orderBy: { createdAt: "desc" },
  });

  await prisma.$transaction([
    ...(unpaidRecord
      ? [
          prisma.feeRecord.update({
            where: { id: unpaidRecord.id },
            data: { status: "PAID", paidAt: new Date() },
          }),
        ]
      : []),
    prisma.studentProfile.update({
      where: { id: studentId },
      data: { hostelPaid: true },
    }),
  ]);

  revalidatePath("/dashboard/student");
}
