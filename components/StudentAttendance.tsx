"use client";

/**
 * ============================================================================
 * StudentAttendance.tsx
 * CampusCore – Attendance Analytics Dashboard (Student Read-Only View)
 * ============================================================================
 *
 * Displays a comprehensive, read-only attendance analytics dashboard for a
 * single logged-in student.  The view has three sections:
 *
 *  1. SUMMARY CARD   – Animated SVG circular ring showing the overall
 *                      attendance percentage across all subjects.
 *                      Colour-codes: ≥75% green, 60-74% amber, <60% red.
 *
 *  2. SUBJECT GRID   – Per-subject attendance breakdown as progress bars
 *                      with attended/total counts and percentage badges.
 *
 *  3. HISTORY TABLE  – Paginated log of recent class sessions with
 *                      date, subject name, and PRESENT/ABSENT badge.
 *
 * Mock data is included so this component renders standalone without an API.
 *
 * Production wiring:
 *   Replace the MOCK_* constants with props passed from a Next.js Server
 *   Component (page.tsx) that fetches from Prisma:
 *     const attendance = await prisma.attendanceRecord.findMany({
 *       where: { studentId },
 *       include: { subject: true },
 *       orderBy: { date: "desc" },
 *     });
 * ============================================================================
 */

import { useState } from "react";
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript interfaces  (match the Prisma schema; extend as needed)
// ─────────────────────────────────────────────────────────────────────────────
interface Student {
  id: number;
  name: string;
  rollNumber: string;
}

interface Subject {
  id: number;
  name: string;
}

/** Aggregated attendance per subject */
interface SubjectAttendance {
  subject: Subject;
  attended: number;  // classes attended
  total: number;     // total classes held
}

/** One row in the history log */
interface AttendanceRecord {
  id: number;
  date: string;           // ISO date string – "2025-07-01"
  subject: Subject;
  status: "PRESENT" | "ABSENT";
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data  (replace with real data props in production)
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_STUDENT: Student = {
  id: 101,
  name: "Aarav Mehta",
  rollNumber: "CS2021001",
};

const MOCK_SUBJECT_ATTENDANCE: SubjectAttendance[] = [
  { subject: { id: 1, name: "Data Structures & Algorithms" }, attended: 34, total: 40 },
  { subject: { id: 2, name: "Operating Systems" }, attended: 37, total: 40 },
  { subject: { id: 3, name: "Database Management" }, attended: 28, total: 38 },
  { subject: { id: 4, name: "Computer Networks" }, attended: 22, total: 36 },
  { subject: { id: 5, name: "Software Engineering" }, attended: 30, total: 32 },
];

const MOCK_HISTORY: AttendanceRecord[] = [
  { id: 1,  date: "2025-07-09", subject: { id: 1, name: "Data Structures & Algorithms" }, status: "PRESENT" },
  { id: 2,  date: "2025-07-09", subject: { id: 2, name: "Operating Systems" },            status: "PRESENT" },
  { id: 3,  date: "2025-07-08", subject: { id: 3, name: "Database Management" },          status: "ABSENT"  },
  { id: 4,  date: "2025-07-08", subject: { id: 4, name: "Computer Networks" },            status: "PRESENT" },
  { id: 5,  date: "2025-07-07", subject: { id: 5, name: "Software Engineering" },         status: "PRESENT" },
  { id: 6,  date: "2025-07-07", subject: { id: 1, name: "Data Structures & Algorithms" }, status: "PRESENT" },
  { id: 7,  date: "2025-07-04", subject: { id: 2, name: "Operating Systems" },            status: "ABSENT"  },
  { id: 8,  date: "2025-07-04", subject: { id: 3, name: "Database Management" },          status: "PRESENT" },
  { id: 9,  date: "2025-07-03", subject: { id: 4, name: "Computer Networks" },            status: "ABSENT"  },
  { id: 10, date: "2025-07-03", subject: { id: 5, name: "Software Engineering" },         status: "PRESENT" },
  { id: 11, date: "2025-07-02", subject: { id: 1, name: "Data Structures & Algorithms" }, status: "PRESENT" },
  { id: 12, date: "2025-07-02", subject: { id: 2, name: "Operating Systems" },            status: "PRESENT" },
  { id: 13, date: "2025-07-01", subject: { id: 3, name: "Database Management" },          status: "ABSENT"  },
  { id: 14, date: "2025-07-01", subject: { id: 4, name: "Computer Networks" },            status: "ABSENT"  },
  { id: 15, date: "2025-06-30", subject: { id: 5, name: "Software Engineering" },         status: "PRESENT" },
];

const HISTORY_PAGE_SIZE = 8;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: compute overall attendance percentage
// ─────────────────────────────────────────────────────────────────────────────
function computeOverall(subjects: SubjectAttendance[]): number {
  const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
  const totalClasses = subjects.reduce((sum, s) => sum + s.total, 0);
  if (totalClasses === 0) return 0;
  return Math.round((totalAttended / totalClasses) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: determine status colour based on attendance %
// ─────────────────────────────────────────────────────────────────────────────
function getAttendanceColor(pct: number): {
  ring: string;      // Tailwind stroke class for SVG
  text: string;      // Tailwind text class
  bg: string;        // badge background
  label: string;     // status label text
} {
  if (pct >= 75)
    return {
      ring: "stroke-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
      label: "On Track",
    };
  if (pct >= 60)
    return {
      ring: "stroke-amber-500",
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
      label: "At Risk",
    };
  return {
    ring: "stroke-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
    label: "Shortage",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: CircularRing
// An SVG-based circular progress ring with a smooth stroke-dashoffset fill.
// ─────────────────────────────────────────────────────────────────────────────
function CircularRing({
  percentage,
  size = 180,
}: {
  percentage: number;
  size?: number;
}) {
  const colors = getAttendanceColor(percentage);

  // SVG circle maths
  const radius = (size - 20) / 2;           // leave 10px padding on each side
  const circumference = 2 * Math.PI * radius;
  const filledLength = (percentage / 100) * circumference;
  const gapLength = circumference - filledLength;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"  /* rotate so arc starts at 12 o'clock */
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={12}
          className="stroke-zinc-200 dark:stroke-zinc-700"
        />
        {/* Filled arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${gapLength}`}
          className={`${colors.ring} transition-all duration-1000 ease-out`}
        />
      </svg>

      {/* Centre content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-black tabular-nums ${colors.text}`}>
          {percentage}%
        </span>
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
          Overall
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: SubjectProgressBar
// ─────────────────────────────────────────────────────────────────────────────
function SubjectProgressBar({ data }: { data: SubjectAttendance }) {
  const pct = Math.round((data.attended / data.total) * 100);
  const colors = getAttendanceColor(pct);

  // Map Tailwind stroke to a fill class for the progress bar
  const barColor =
    pct >= 75
      ? "bg-emerald-500"
      : pct >= 60
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
      {/* Subject name + percentage */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 leading-tight">
          {data.subject.name}
        </p>
        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${colors.bg}`}>
          {pct}%
        </span>
      </div>

      {/* Progress track */}
      <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Attended / Total */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">{data.attended}</span>
        {" / "}
        {data.total} classes attended
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props  (all optional — component falls back to mock data if not provided)
// ─────────────────────────────────────────────────────────────────────────────
interface StudentAttendanceProps {
  /** Real student info from the DB; falls back to MOCK_STUDENT */
  student?: Student;
  /** Real per-subject aggregates from the DB; falls back to MOCK_SUBJECT_ATTENDANCE */
  subjectAttendance?: SubjectAttendance[];
  /** Real history rows from the DB; falls back to MOCK_HISTORY */
  history?: AttendanceRecord[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentAttendance({
  student,
  subjectAttendance,
  history,
}: StudentAttendanceProps = {}) {
  // Resolve real data vs. mock fallback
  const activeStudent          = student           ?? MOCK_STUDENT;
  const activeSubjectAtt       = subjectAttendance ?? MOCK_SUBJECT_ATTENDANCE;
  const activeHistory          = history           ?? MOCK_HISTORY;

  // History pagination
  const [historyPage, setHistoryPage] = useState(1);

  // Computed values
  const overallPct    = computeOverall(activeSubjectAtt);
  const overallColors = getAttendanceColor(overallPct);

  const totalPages  = Math.ceil(activeHistory.length / HISTORY_PAGE_SIZE);
  const pagedHistory = activeHistory.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE,
  );

  // Counts for summary stats
  const totalPresent = activeHistory.filter((r) => r.status === "PRESENT").length;
  const totalAbsent  = activeHistory.filter((r) => r.status === "ABSENT").length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
              My Attendance
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {activeStudent.name} · {activeStudent.rollNumber}
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  SECTION 1: Overall Summary Card                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* Circular ring */}
            <div className="shrink-0">
              <CircularRing percentage={overallPct} size={180} />
            </div>

            {/* Right-side stats */}
            <div className="flex-1 w-full space-y-4">
              {/* Status badge */}
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${overallColors.bg}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {overallColors.label}
                </span>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    {totalPresent}
                  </p>
                  <p className="text-xs font-semibold text-emerald-600/70 dark:text-emerald-500 mt-0.5">
                    Classes Present
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    {totalAbsent}
                  </p>
                  <p className="text-xs font-semibold text-rose-500/70 dark:text-rose-500 mt-0.5">
                    Classes Absent
                  </p>
                </div>
              </div>

              {/* Minimum attendance warning */}
              {overallPct < 75 && (
                <div className="px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ Attendance below 75%. You need{" "}
                  <strong>
                    {Math.ceil(
                      (0.75 * activeSubjectAtt.reduce((s, x) => s + x.total, 0) -
                        activeSubjectAtt.reduce((s, x) => s + x.attended, 0)) /
                        0.25,
                    )}
                  </strong>{" "}
                  more consecutive classes to reach the 75% threshold.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  SECTION 2: Per-Subject Breakdown                                 */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-zinc-950 dark:text-zinc-50">
              Subject Breakdown
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeSubjectAtt.map((data) => (
              <SubjectProgressBar key={data.subject.id} data={data} />
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  SECTION 3: Attendance History Log                                */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-zinc-950 dark:text-zinc-50">
              Recent History
            </h2>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_2fr_auto] gap-4 px-5 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Date
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Subject
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Status
              </span>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {pagedHistory.map((record) => {
                const isPresent = record.status === "PRESENT";
                // Format the date nicely e.g. "Jul 9"
                const dateLabel = new Date(record.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  timeZone: "UTC",
                });

                return (
                  <div
                    key={record.id}
                    className="grid grid-cols-[1fr_2fr_auto] gap-4 items-center px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* Date */}
                    <span className="text-sm font-mono text-zinc-500 dark:text-zinc-400">
                      {dateLabel}
                    </span>

                    {/* Subject name */}
                    <span className="text-sm font-medium text-zinc-950 dark:text-zinc-100 truncate">
                      {record.subject.name}
                    </span>

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap
                        ${isPresent
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                          : "bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                        }`}
                    >
                      {/* Dot indicator */}
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isPresent ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      {isPresent ? "Present" : "Absent"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  Page {historyPage} of {totalPages} · {activeHistory.length} records
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  </button>
                  <button
                    onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                    disabled={historyPage === totalPages}
                    className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer note ──────────────────────────────────────────────────── */}
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 pb-4">
          Attendance data is updated in real-time by AI facial recognition. Contact your teacher for corrections.
        </p>
      </div>
    </div>
  );
}
