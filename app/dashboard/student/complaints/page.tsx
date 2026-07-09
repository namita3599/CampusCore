import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import StudentComplaintsClient from "./StudentComplaintsClient";

export default async function StudentComplaintsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") redirect("/login");

  const userId = Number(session.user.id);

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!studentProfile) {
    return (
      <div className="p-8 text-center bg-white border border-zinc-200 rounded-2xl max-w-md mx-auto mt-12 shadow-sm">
        <p className="text-zinc-500 font-medium">Student profile not found. Please contact the administrator.</p>
      </div>
    );
  }

  const [enrolledSubjects, bookedRoom, complaints] = await Promise.all([
    prisma.studentSubject.findMany({
      where: { studentId: studentProfile.id },
      include: { subject: true },
    }),
    prisma.room.findFirst({
      where: { bookedByUserId: userId },
      include: { hostel: true },
    }),
    prisma.complaint.findMany({
      where: { studentId: studentProfile.id },
      include: {
        subject: true,
        hostel: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const subjects = enrolledSubjects.map((es) => es.subject);
  const hostel = bookedRoom ? bookedRoom.hostel : null;

  // Map complaints to a plain object structure to safely pass across the server-client boundary
  const mappedComplaints = complaints.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    resolvedAt: c.resolvedAt ? c.resolvedAt.toISOString() : null,
    resolution: c.resolution,
    subject: c.subject ? { id: c.subject.id, name: c.subject.name } : null,
    hostel: c.hostel ? { id: c.hostel.id, name: c.hostel.name } : null,
  }));

  return (
    <StudentComplaintsClient
      subjects={subjects}
      hostel={hostel}
      initialComplaints={mappedComplaints}
    />
  );
}
