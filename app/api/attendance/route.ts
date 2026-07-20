/**
 * ============================================================================
 * app/api/attendance/route.ts
 * CampusCore – Save Attendance API Route
 * ============================================================================
 *
 * POST /api/attendance
 *
 * Called by <TeacherAttendance> after the teacher reviews and confirms the
 * AI-generated attendance roster.
 *
 * Request body (JSON):
 * {
 *   subjectId : number,
 *   date      : string (ISO-8601, e.g. "2025-07-10T00:00:00.000Z"),
 *   attendance: Array<{ studentId: number; status: "PRESENT" | "ABSENT" }>
 * }
 *
 * Response (JSON):
 * { success: true, saved: number }   – number of upserted records
 *
 * Design notes:
 * ─────────────
 * • Prisma upsert is used so if a teacher re-submits for the same day/subject
 *   (e.g. after a correction), existing records are updated rather than
 *   creating duplicates. The unique key is (studentId, subjectId, date).
 *
 * • All upserts are wrapped in a Prisma interactive transaction so either
 *   ALL records save or NONE do — partial attendance saves never happen.
 *
 * • The date is normalised to midnight UTC before saving so the @db.Date
 *   column in PostgreSQL receives a clean date value.
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getTenantPrisma } from "@/lib/prisma-tenant";

// ─────────────────────────────────────────────────────────────────────────────
// Type for each row in the attendance array from the request body
// ─────────────────────────────────────────────────────────────────────────────
interface AttendanceEntry {
  studentId: number;
  status: "PRESENT" | "ABSENT";
}

// ─────────────────────────────────────────────────────────────────────────────
// GET handler: Fetch attendance records for a specific subject and date
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Unauthorised." },
      { status: 401 },
    );
  }

  const institutionId = session.user.institutionId;
  if (!institutionId) {
    return NextResponse.json({ error: "No institution context in session." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const subjectIdStr = searchParams.get("subjectId");
  const mode = searchParams.get("mode");

  if (!subjectIdStr) {
    return NextResponse.json(
      { error: "Missing subjectId query parameter." },
      { status: 400 },
    );
  }

  const subjectId = Number(subjectIdStr);
  if (isNaN(subjectId)) {
    return NextResponse.json(
      { error: "Invalid subjectId format." },
      { status: 400 },
    );
  }

  const db = getTenantPrisma(institutionId);

  try {
    const subject = await db.subject.findUnique({
      where: { id: subjectId },
      include: {
        studentSubjects: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                rollNumber: true,
              },
            },
          },
        },
      },
    });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found." }, { status: 404 });
    }

    const enrolledStudents = subject.studentSubjects.map((ss) => ({
      id: ss.student.id,
      name: ss.student.name,
      rollNumber: ss.student.rollNumber ?? "—",
    }));

    if (mode === "month") {
      const monthStr = searchParams.get("month"); // "YYYY-MM"
      if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
        return NextResponse.json(
          { error: "Missing or invalid month parameter (expected YYYY-MM)." },
          { status: 400 },
        );
      }

      const [year, month] = monthStr.split("-").map(Number);
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 1));

      const records = await db.attendanceRecord.findMany({
        where: {
          subjectId,
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        select: {
          studentId: true,
          date: true,
          status: true,
        },
      });

      return NextResponse.json({
        students: enrolledStudents,
        records: records.map((r) => ({
          studentId: r.studentId,
          date: r.date.toISOString().split("T")[0],
          status: r.status,
        })),
      });
    }

    const dateStr = searchParams.get("date");
    if (!dateStr) {
      return NextResponse.json(
        { error: "Missing date query parameter." },
        { status: 400 },
      );
    }

    const searchDate = new Date(dateStr);
    searchDate.setUTCHours(0, 0, 0, 0);

    if (isNaN(searchDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format." },
        { status: 400 },
      );
    }

    const records = await db.attendanceRecord.findMany({
      where: {
        subjectId,
        date: searchDate,
      },
      select: {
        studentId: true,
        status: true,
      },
    });

    const recordMap = new Map(records.map((r) => [r.studentId, r.status]));

    const students = enrolledStudents.map((student) => ({
      ...student,
      status: recordMap.get(student.id) ?? null,
    }));

    return NextResponse.json({ students });
  } catch (err) {
    console.error("[GET /api/attendance] DB error:", err);
    return NextResponse.json(
      { error: "Database error while fetching attendance records." },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── Auth guard: only teachers may mark attendance ─────────────────────────
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json(
      { error: "Unauthorised – only teachers can save attendance." },
      { status: 401 },
    );
  }

  const institutionId = session.user.institutionId;
  if (!institutionId) {
    return NextResponse.json({ error: "No institution context in session." }, { status: 401 });
  }

  const db = getTenantPrisma(institutionId);

  // ── Parse and validate request body ──────────────────────────────────────
  let body: { subjectId: unknown; date: unknown; attendance: unknown; isManual?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { subjectId, date, attendance, isManual } = body;

  if (
    typeof subjectId !== "number" ||
    typeof date !== "string" ||
    !Array.isArray(attendance) ||
    attendance.length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid fields. Expected: { subjectId: number, date: string, attendance: Array }",
      },
      { status: 400 },
    );
  }

  // ── Normalise date to midnight UTC ────────────────────────────────────────
  // The @db.Date column in PostgreSQL stores a pure date (no time).
  // We strip the time component here so the unique constraint
  // (studentId, subjectId, date) is consistent regardless of what time
  // of day the teacher submits.
  const attendanceDate = new Date(date);
  attendanceDate.setUTCHours(0, 0, 0, 0);

  if (isNaN(attendanceDate.getTime())) {
    return NextResponse.json(
      { error: `Invalid date string: "${date}"` },
      { status: 400 },
    );
  }

  // ── Verify the subject exists (tenant-scoped) ──────────────────────────────
  const subject = await db.subject.findUnique({
    where: { id: subjectId },
    select: { id: true },
  });
  if (!subject) {
    return NextResponse.json(
      { error: `Subject with id=${subjectId} not found.` },
      { status: 404 },
    );
  }

  // ── Upsert attendance records ─────────────────────────────────────────────
  // If isManual is false/undefined (AI flow): Once marked PRESENT, stay PRESENT.
  // If isManual is true (manual view/edit): Allow downgrading PRESENT to ABSENT.
  try {
    const entries = attendance as AttendanceEntry[];

    // 1. Load any existing PRESENT records for this date + subject
    const alreadyPresent = await db.attendanceRecord.findMany({
      where: {
        subjectId: Number(subjectId),
        date: attendanceDate,
        status: "PRESENT",
      },
      select: { studentId: true },
    });
    const alreadyPresentIds = new Set(alreadyPresent.map((r) => r.studentId));

    // 2. Filter entries unless it is a manual correction
    const entriesToWrite = isManual
      ? entries
      : entries.filter(
          ({ studentId, status }) =>
            status === "PRESENT" ||
            !alreadyPresentIds.has(Number(studentId)),
        );

    if (entriesToWrite.length === 0) {
      // Nothing to do — all ABSENT entries were blocked by existing PRESENT records
      return NextResponse.json({
        success: true,
        saved: 0,
        date: attendanceDate.toISOString().split("T")[0],
        subjectId,
        note: "No changes — all submitted ABSENT entries were blocked by existing PRESENT records.",
      });
    }

    await db.$transaction(
      entriesToWrite.map(({ studentId, status }) =>
        db.attendanceRecord.upsert({
          where: {
            studentId_subjectId_date: {
              studentId: Number(studentId),
              subjectId: Number(subjectId),
              date: attendanceDate,
            },
          },
          update: {
            // Safe to update: either it's a PRESENT upgrade, or the student
            // wasn't PRESENT before (ABSENT → ABSENT or ABSENT → PRESENT).
            status,
          },
          create: {
            institutionId,
            studentId: Number(studentId),
            subjectId: Number(subjectId),
            date: attendanceDate,
            status,
          },
        }),
      ),
    );
  } catch (err) {
    console.error("[POST /api/attendance] DB error:", err);
    return NextResponse.json(
      { error: "Database error while saving attendance." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    saved: attendance.length,
    date: attendanceDate.toISOString().split("T")[0], // "YYYY-MM-DD" for confirmation
    subjectId,
  });
}
