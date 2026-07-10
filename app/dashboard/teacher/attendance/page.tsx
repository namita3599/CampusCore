import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TeacherAttendance from "@/components/TeacherAttendance";

export const metadata = {
  title: "AI Attendance | CampusCore",
  description: "Upload a group photo and let AI mark attendance for your class instantly.",
};

/**
 * Teacher Attendance Page (Server Component)
 * ───────────────────────────────────────────
 * Route: /dashboard/teacher/attendance
 *
 * 1. Guards the route — only TEACHER role may access.
 * 2. Fetches the teacher's own assigned subjects from the DB, including
 *    the list of students enrolled in each subject via StudentSubject.
 * 3. Passes the data down to <TeacherAttendance> (Client Component)
 *    so the dropdown only ever shows the teacher's own subjects,
 *    and the roster shows only students actually enrolled in that subject.
 */
export default async function TeacherAttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") redirect("/login");

  const userId = Number(session.user.id);

  // ── Find the teacher's profile + their subjects + enrolled students ────────
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId },
    include: {
      subjects: {
        include: {
          // StudentSubject is the many-to-many join table
          studentSubjects: {
            include: {
              student: {
                select: { id: true, name: true, rollNumber: true },
              },
            },
          },
        },
      },
    },
  });

  if (!teacher) {
    return (
      <div className="p-8 text-center bg-white border border-zinc-200 rounded-2xl max-w-md mx-auto mt-12 shadow-sm">
        <p className="text-zinc-500 font-medium">
          Teacher profile not found. Contact your administrator.
        </p>
      </div>
    );
  }

  // ── Shape the data for the component ──────────────────────────────────────
  // SubjectWithStudents: { id, name, students: [{id, name, rollNumber}] }
  const subjects = teacher.subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    students: subject.studentSubjects.map((ss) => ({
      id: ss.student.id,
      name: ss.student.name,
      rollNumber: ss.student.rollNumber ?? "—",
    })),
  }));

  return <TeacherAttendance subjects={subjects} />;
}
