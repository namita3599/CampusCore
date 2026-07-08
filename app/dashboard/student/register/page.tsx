import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import CourseRegistrationClient from "./CourseRegistrationClient";

const BackBtn = () => (
  <Link
    href="/dashboard/student"
    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
  >
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
    </svg>
    Back to Dashboard
  </Link>
);

export default async function CourseRegistrationPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "STUDENT") redirect("/login");

  const userId = parseInt(session.user.id);

  const [profile, allSubjects, settings] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        tuitionPaid: true,
        courseRegistered: true,
        studentSubjects: { select: { subjectId: true } },
      },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.systemSettings.findUnique({ where: { id: 1 } }),
  ]);

  const isLocked = settings?.courseRegistrationLocked ?? false;

  if (!profile) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center rounded-2xl border border-zinc-200 bg-white p-12 shadow-sm">
          <p className="text-zinc-500">Student profile not found. Contact the admin.</p>
        </div>
      </div>
    );
  }

  // ── Fee gate ──────────────────────────────────────────────────
  if (!profile.tuitionPaid) {
    return (
      <div className="p-8 space-y-8 animate-fadeInUp text-zinc-950">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Student Portal</p>
            <h1 className="text-2xl font-bold text-zinc-950">Course Registration</h1>
            <p className="text-zinc-500 text-sm mt-1">Register for your academic courses for the current semester.</p>
          </div>
          <BackBtn />
        </div>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center rounded-2xl border border-amber-200 bg-amber-50 p-12 shadow-sm max-w-lg space-y-5">
            <div className="text-5xl">🔒</div>
            <div>
              <h2 className="text-lg font-bold text-zinc-950 mb-2">Course Registration Locked</h2>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Course registration is only available after your{" "}
                <span className="font-semibold text-amber-700">tuition fee</span> has been paid.
                Please complete your fee payment to unlock this section.
              </p>
            </div>
            <Link
              href="/dashboard/student/fees"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              💳 Pay Tuition Fee →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fadeInUp text-zinc-950">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Student Portal</p>
          <h1 className="text-2xl font-bold text-zinc-950">Course Registration</h1>
          <p className="text-zinc-500 text-sm mt-1">Register for your academic courses for the current semester.</p>
        </div>
        <BackBtn />
      </div>

      <CourseRegistrationClient
        profileId={profile.id}
        initialRegisteredIds={profile.studentSubjects.map((ss) => ss.subjectId)}
        initialStatus={profile.courseRegistered}
        allSubjects={allSubjects}
        isLocked={isLocked}
      />
    </div>
  );
}
