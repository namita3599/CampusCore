import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import TeacherComplaintsClient from "./TeacherComplaintsClient";

export default async function TeacherComplaintsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") redirect("/login");

  const userId = Number(session.user.id);

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId },
    include: { subjects: true },
  });

  if (!teacher) {
    return (
      <div className="p-8 text-center bg-white border border-zinc-200 rounded-2xl max-w-md mx-auto mt-12 shadow-sm">
        <p className="text-zinc-500 font-medium">Teacher profile not found. Contact administrator.</p>
      </div>
    );
  }

  const subjectIds = teacher.subjects.map((s) => s.id);

  const complaints = await prisma.complaint.findMany({
    where: {
      category: "COURSE",
      subjectId: { in: subjectIds },
    },
    include: {
      student: true,
      subject: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const mappedComplaints = complaints.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    resolvedAt: c.resolvedAt ? c.resolvedAt.toISOString() : null,
    resolution: c.resolution,
    student: {
      id: c.student.id,
      name: c.student.name,
      rollNumber: c.student.rollNumber,
      branch: c.student.branch,
    },
    subject: c.subject ? { id: c.subject.id, name: c.subject.name } : null,
  }));

  return <TeacherComplaintsClient initialComplaints={mappedComplaints} />;
}
