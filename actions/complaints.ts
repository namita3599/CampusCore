"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Submits a new student complaint.
 */
export async function createComplaint(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    throw new Error("Unauthorized. Only students can submit complaints.");
  }

  const userId = Number(session.user.id);
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string; // "COURSE" or "HOSTEL"
  const subjectIdStr = formData.get("subjectId") as string;

  if (!title || title.trim() === "") throw new Error("Complaint title is required.");
  if (!description || description.trim() === "") throw new Error("Complaint description is required.");
  if (!category || (category !== "COURSE" && category !== "HOSTEL")) {
    throw new Error("Invalid complaint category.");
  }

  // Find StudentProfile
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });
  if (!student) throw new Error("Student profile not found.");

  let subjectId: number | null = null;
  let hostelId: number | null = null;

  if (category === "COURSE") {
    if (!subjectIdStr) throw new Error("Subject must be selected for course-related complaints.");
    subjectId = Number(subjectIdStr);

    // Verify enrollment
    const enrollment = await prisma.studentSubject.findUnique({
      where: {
        studentId_subjectId: {
          studentId: student.id,
          subjectId,
        },
      },
    });
    if (!enrollment) {
      throw new Error("You can only submit complaints for courses you are enrolled in.");
    }
  } else if (category === "HOSTEL") {
    // Retrieve the student's active room booking
    const bookedRoom = await prisma.room.findFirst({
      where: { bookedByUserId: userId },
    });
    if (!bookedRoom) {
      throw new Error("You must be allocated to a hostel room to file a hostel complaint.");
    }
    hostelId = bookedRoom.hostelId;
  }

  try {
    await prisma.complaint.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category,
        studentId: student.id,
        subjectId,
        hostelId,
      },
    });
  } catch (error: any) {
    console.error("Failed to create complaint record:", error);
    throw new Error(error.message || "Database execution failed when creating complaint.");
  }

  revalidatePath("/dashboard/student/complaints");
}

/**
 * Resolves a student complaint.
 */
export async function resolveComplaint(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "WARDEN")) {
    throw new Error("Unauthorized. Only teachers or wardens can resolve complaints.");
  }

  const complaintIdStr = formData.get("complaintId") as string;
  const resolution = formData.get("resolution") as string;

  if (!complaintIdStr) throw new Error("Complaint ID is required.");
  if (!resolution || resolution.trim() === "") throw new Error("Resolution feedback is required.");

  const complaintId = Number(complaintIdStr);

  try {
    await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: "RESOLVED",
        resolution: resolution.trim(),
        resolvedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error("Failed to resolve complaint:", error);
    throw new Error(error.message || "Database update failed when resolving complaint.");
  }

  revalidatePath("/dashboard/student/complaints");
  revalidatePath("/dashboard/teacher/complaints");
  revalidatePath("/dashboard/warden/complaints");
}
