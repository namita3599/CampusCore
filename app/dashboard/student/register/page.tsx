import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import CourseRegistrationClient from "./CourseRegistrationClient";

export default async function CourseRegistrationPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "STUDENT") redirect("/login");

  const userId = parseInt(session.user.id);

  const [profile, allSubjects] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        courseRegistered: true,
        studentSubjects: { select: { subjectId: true } },
      },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!profile) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center rounded-2xl border border-zinc-200 bg-white p-12 shadow-sm">
          <p className="text-zinc-500">Student profile not found. Contact the admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fadeInUp text-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Student Portal</p>
          <h1 className="text-2xl font-bold text-zinc-950">Course Registration</h1>
          <p className="text-zinc-500 text-sm mt-1">Register for your academic courses for the current semester.</p>
        </div>

        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <CourseRegistrationClient
        profileId={profile.id}
        initialRegisteredIds={profile.studentSubjects.map((ss) => ss.subjectId)}
        initialStatus={profile.courseRegistered}
        allSubjects={allSubjects}
      />
    </div>
  );
}
