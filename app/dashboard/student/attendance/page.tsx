import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StudentAttendance from "@/components/StudentAttendance";

export const metadata = {
  title: "My Attendance | CampusCore",
  description: "View your attendance analytics, subject breakdown, and class history.",
};

/**
 * Student Attendance Page (Server Component)
 * ───────────────────────────────────────────
 * Route: /dashboard/student/attendance
 *
 * Fetches the logged-in student's AttendanceRecord rows from the DB,
 * computes per-subject aggregates server-side, and passes everything to the
 * <StudentAttendance> Client Component as typed props.
 *
 * Data flow:
 *   Prisma → AttendanceRecord[] (with subject included)
 *     → group by subjectId  → SubjectAttendance[]  (for the progress bars)
 *     → sort by date desc   → AttendanceRecord[]   (for the history table)
 */
export default async function StudentAttendancePage() {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") redirect("/login");

  const userId = Number(session.user.id);

  // ── Fetch student profile ─────────────────────────────────────────────────
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true, name: true, rollNumber: true },
  });

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-500">Student profile not found. Contact your administrator.</p>
      </div>
    );
  }

  // ── Fetch all attendance records for this student ─────────────────────────
  const rawRecords = await prisma.attendanceRecord.findMany({
    where: { studentId: profile.id },
    include: { subject: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });

  // ── Build the history list (most recent first) ────────────────────────────
  // Serialise the Date to a "YYYY-MM-DD" string — Date objects cannot cross
  // the Server→Client boundary in Next.js without serialisation.
  const history = rawRecords.map((r) => ({
    id: r.id,
    date: r.date.toISOString().split("T")[0],
    subject: { id: r.subject.id, name: r.subject.name },
    status: r.status as "PRESENT" | "ABSENT",
  }));

  // ── Compute per-subject aggregates ────────────────────────────────────────
  // Group records by subjectId, counting attended classes and total classes.
  const subjectMap = new Map<
    number,
    { subject: { id: number; name: string }; attended: number; total: number }
  >();

  for (const r of rawRecords) {
    const existing = subjectMap.get(r.subjectId);
    if (existing) {
      existing.total += 1;
      if (r.status === "PRESENT") existing.attended += 1;
    } else {
      subjectMap.set(r.subjectId, {
        subject: { id: r.subject.id, name: r.subject.name },
        attended: r.status === "PRESENT" ? 1 : 0,
        total: 1,
      });
    }
  }

  const subjectAttendance = Array.from(subjectMap.values());

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <StudentAttendance
      student={{
        id: profile.id,
        name: profile.name,
        rollNumber: profile.rollNumber ?? "—",
      }}
      subjectAttendance={subjectAttendance}
      history={history}
    />
  );
}
