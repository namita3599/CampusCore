import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import TeacherStudentsClient from "./TeacherStudentsClient";

export const metadata = {
  title: "Manage Students | CampusCore",
  description: "View and manage enrolled students and their attendance subject-wise.",
};

export default async function ManageStudentsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") redirect("/login");

  const userId = Number(session.user.id);

  // Fetch the teacher profile along with subjects, students enrolled, and attendance records
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId },
    include: {
      subjects: {
        include: {
          studentSubjects: {
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      username: true,
                      email: true,
                    },
                  },
                  attendanceRecords: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!teacher) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-zinc-500">Teacher profile not found. Contact the admin.</p>
        </div>
      </div>
    );
  }

  // Normalize the data for the component
  const subjectGroups = teacher.subjects.map((subject) => {
    const students = subject.studentSubjects.map((ss) => {
      const student = ss.student;
      // Filter attendance records to only include those for this specific subject
      const subjectAttendance = student.attendanceRecords.filter(
        (rec) => rec.subjectId === subject.id
      );

      const totalClasses = subjectAttendance.length;
      const attended = subjectAttendance.filter((rec) => rec.status === "PRESENT").length;
      const percentage = totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 100;

      return {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        branch: student.branch,
        tuitionPaid: student.tuitionPaid,
        username: student.user.username,
        email: student.user.email,
        attendance: {
          totalClasses,
          attended,
          percentage,
        },
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    return {
      id: subject.id,
      name: subject.name,
      students,
    };
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 animate-fadeInUp text-zinc-950">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Faculty Portal</p>
          <h1 className="text-2xl font-bold text-zinc-950">Manage Students</h1>
          <p className="text-zinc-500 text-sm mt-1">
            View student enrollment records and track attendance statistics subject-wise.
          </p>
        </div>
        <Link
          href="/dashboard/teacher"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Interactive List component */}
      <TeacherStudentsClient subjects={subjectGroups} />
    </div>
  );
}
