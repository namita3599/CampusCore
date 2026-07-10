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
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Type for each row in the attendance array from the request body
// ─────────────────────────────────────────────────────────────────────────────
interface AttendanceEntry {
  studentId: number;
  status: "PRESENT" | "ABSENT";
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

  // ── Parse and validate request body ──────────────────────────────────────
  let body: { subjectId: unknown; date: unknown; attendance: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { subjectId, date, attendance } = body;

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

  // ── Verify the subject exists ─────────────────────────────────────────────
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true },
  });
  if (!subject) {
    return NextResponse.json(
      { error: `Subject with id=${subjectId} not found.` },
      { status: 404 },
    );
  }

  // ── Upsert all attendance records in a single transaction ─────────────────
  // Using $transaction ensures atomicity: all rows save or none do.
  // Prisma's upsert handles re-submission gracefully:
  //   • If the record doesn't exist yet   → INSERT
  //   • If it already exists for that day → UPDATE status only
  try {
    const entries = attendance as AttendanceEntry[];

    await prisma.$transaction(
      entries.map(({ studentId, status }) =>
        prisma.attendanceRecord.upsert({
          where: {
            studentId_subjectId_date: {
              studentId: Number(studentId),
              subjectId: Number(subjectId),
              date: attendanceDate,
            },
          },
          update: {
            // Teacher corrected the attendance — overwrite previous status
            status,
          },
          create: {
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
