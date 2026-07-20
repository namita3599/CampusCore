import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TeacherAttendanceRecords from "@/components/TeacherAttendanceRecords";

export const metadata = {
  title: "Attendance Records | CampusCore",
  description: "View and manually edit student attendance records.",
};

export default async function TeacherAttendanceRecordsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") redirect("/login");

  const userId = Number(session.user.id);

  // Find the teacher's profile + subjects + enrolled students
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId },
    include: {
      subjects: {
        include: {
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

  // Shape the data for the component
  const subjects = teacher.subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    students: subject.studentSubjects.map((ss) => ({
      id: ss.student.id,
      name: ss.student.name,
      rollNumber: ss.student.rollNumber ?? "—",
    })),
  }));

  return (
    <TeacherAttendanceRecords
      subjects={subjects}
      institutionId={session.user.institutionId}
    />
  );
}
