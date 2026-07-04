import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import StudentDashboardClient from "./StudentDashboardClient";

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "STUDENT") redirect("/login");

  const userId = parseInt(session.user.id);

  const [profile, allSubjects] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        studentSubjects: { include: { subject: true } },
      },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!profile) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center glass rounded-2xl p-12">
          <p className="text-slate-400">Student profile not found. Contact the admin.</p>
        </div>
      </div>
    );
  }

  return <StudentDashboardClient profile={profile} allSubjects={allSubjects} />;
}
