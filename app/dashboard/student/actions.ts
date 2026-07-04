"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function registerSubjects(studentId: number, subjectIds: number[]) {
  if (subjectIds.length === 0) throw new Error("Select at least one subject.");

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
  await prisma.studentProfile.update({
    where: { id: studentId },
    data: { tuitionPaid: true },
  });
  revalidatePath("/dashboard/student");
}

export async function payHostel(studentId: number) {
  await prisma.studentProfile.update({
    where: { id: studentId },
    data: { hostelPaid: true },
  });
  revalidatePath("/dashboard/student");
}
