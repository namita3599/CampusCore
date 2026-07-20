"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Save,
  Search,
  UserCheck,
  UserX,
  X,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";

interface Student {
  id: number;
  name: string;
  rollNumber: string;
}

interface SubjectWithStudents {
  id: number;
  name: string;
  students: Student[];
}

interface TeacherAttendanceRecordsProps {
  subjects: SubjectWithStudents[];
  institutionId: string;
}

interface StudentAttendanceRecord {
  id: number;
  name: string;
  rollNumber: string;
  status: "PRESENT" | "ABSENT" | null; // null means not marked yet
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function TeacherAttendanceRecords({
  subjects,
  institutionId,
}: TeacherAttendanceRecordsProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(
    subjects[0]?.id ?? null
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayString());
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);

  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  // Map to store unsaved manual changes: studentId -> status
  const [pendingChanges, setPendingChanges] = useState<
    Record<number, "PRESENT" | "ABSENT">
  >({});

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  // ── Fetch Attendance Records ──────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    if (!selectedSubjectId || !selectedDate) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPendingChanges({});

    try {
      const res = await fetch(
        `/api/attendance?subjectId=${selectedSubjectId}&date=${selectedDate}`
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch records: HTTP ${res.status}`);
      }
      const data = (await res.json()) as { students: StudentAttendanceRecord[] };
      setRecords(data.students);
    } catch (err) {
      console.error("[TeacherAttendanceRecords] Fetch error:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to load attendance records."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedSubjectId, selectedDate]);

  // Refetch when subject or date changes
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // ── Manage Manual Toggles ───────────────────────────────────────────────
  const handleStatusChange = (studentId: number, status: "PRESENT" | "ABSENT") => {
    setPendingChanges((prev) => ({
      ...prev,
      [studentId]: status,
    }));
    setSuccessMsg(null);
  };

  const handleResetChanges = () => {
    setPendingChanges({});
    setSuccessMsg(null);
  };

  // Mark all filtered/visible students as present/absent
  const handleMarkAll = (status: "PRESENT" | "ABSENT") => {
    const visibleStudents = filteredRecords;
    const newChanges = { ...pendingChanges };
    visibleStudents.forEach((student) => {
      newChanges[student.id] = status;
    });
    setPendingChanges(newChanges);
    setSuccessMsg(null);
  };

  // ── Save manual modifications to DB ──────────────────────────────────────
  const handleSave = async () => {
    const changesCount = Object.keys(pendingChanges).length;
    if (changesCount === 0 || !selectedSubjectId) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Merge changes with current records to construct the complete payload
    const attendancePayload = records.map((r) => ({
      studentId: r.id,
      status: pendingChanges[r.id] ?? r.status ?? "ABSENT", // Fallback to ABSENT if not marked yet
    }));

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          date: selectedDate,
          attendance: attendancePayload,
          isManual: true, // Bypass the AI flow "PRESENT is sticky" safety check
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `Save failed: HTTP ${res.status}`);
      }

      setSuccessMsg(`Successfully updated attendance records for ${changesCount} student(s).`);
      setPendingChanges({});
      // Refresh the list to reflect newly saved values
      await fetchRecords();
    } catch (err) {
      console.error("[TeacherAttendanceRecords] Save error:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to save attendance changes."
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Download Excel Sheet (Monthly Matrix) ──────────────────────────────────
  const handleExportExcel = async () => {
    if (!selectedSubjectId || !selectedDate) return;
    setExporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const monthKey = selectedDate.substring(0, 7); // e.g. "2026-07"
      const res = await fetch(`/api/attendance?subjectId=${selectedSubjectId}&mode=month&month=${monthKey}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch monthly records: HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        students: { id: number; name: string; rollNumber: string }[];
        records: { studentId: number; date: string; status: "PRESENT" | "ABSENT" }[];
      };

      // Calculate dates of the selected month
      const [year, month] = monthKey.split("-").map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const datesList: string[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = String(d).padStart(2, "0");
        const monthStr = String(month).padStart(2, "0");
        datesList.push(`${year}-${monthStr}-${dayStr}`);
      }

      // Map records for O(1) lookup: studentId_date -> status
      const recordMap = new Map<string, "PRESENT" | "ABSENT" | null>();
      data.records.forEach((r) => {
        recordMap.set(`${r.studentId}_${r.date}`, r.status);
      });

      // Construct spreadsheet headers
      const headers = [
        "Student Name",
        "Roll Number",
        ...datesList.map((d) => d.split("-")[2]), // Just day number "01", "02", ... for clean spacing
        "Total Present",
        "Total Absent",
        "Attendance %",
      ];

      const rows = data.students.map((student) => {
        let presentCount = 0;
        let absentCount = 0;

        const dailyStatuses = datesList.map((date) => {
          const status = recordMap.get(`${student.id}_${date}`);
          if (status === "PRESENT") {
            presentCount++;
            return "P";
          } else if (status === "ABSENT") {
            absentCount++;
            return "A";
          }
          return "—";
        });

        const totalMarked = presentCount + absentCount;
        const percentage = totalMarked > 0 ? `${Math.round((presentCount / totalMarked) * 100)}%` : "—";

        return [
          student.name,
          student.rollNumber,
          ...dailyStatuses,
          presentCount,
          absentCount,
          percentage,
        ];
      });

      const aoa = [
        [`Monthly Attendance Sheet: ${selectedSubject?.name ?? "Subject"}`],
        [`Month: ${formatDate(selectedDate).split(" ").slice(1).join(" ")}`],
        [], // blank spacer
        headers,
        ...rows,
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance Records");

      // Custom column widths: Name & Roll large, day columns extremely small & compact
      ws["!cols"] = [
        { wch: 24 }, // Student Name
        { wch: 14 }, // Roll Number
        ...datesList.map(() => ({ wch: 4 })), // Day numbers
        { wch: 13 }, // Total Present
        { wch: 13 }, // Total Absent
        { wch: 14 }, // Attendance %
      ];

      XLSX.writeFile(wb, `Attendance_${selectedSubject?.name ?? "records"}_${monthKey}.xlsx`);
      setSuccessMsg(`Successfully generated monthly attendance sheet for ${monthKey}.`);
    } catch (err) {
      console.error("[Excel Export] error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to export Excel file.");
    } finally {
      setExporting(false);
    }
  };

  // ── Search & Filter ────────────────────────────────────────────────────────
  const filteredRecords = records.filter((student) => {
    const term = searchTerm.toLowerCase();
    return (
      student.name.toLowerCase().includes(term) ||
      student.rollNumber.toLowerCase().includes(term)
    );
  });

  // ── Compute Stats (including pending changes) ──────────────────────────────
  const getComputedStatus = (student: StudentAttendanceRecord) => {
    return pendingChanges[student.id] ?? student.status;
  };

  const totalPresent = records.filter((r) => getComputedStatus(r) === "PRESENT").length;
  const totalAbsent = records.filter((r) => getComputedStatus(r) === "ABSENT").length;
  const totalNotMarked = records.filter((r) => getComputedStatus(r) === null).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8 text-zinc-950 dark:text-zinc-50">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/teacher/attendance"
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Attendance Records</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                View attendance list and manually override records.
              </p>
            </div>
          </div>
          {selectedSubjectId && (
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm transition-colors cursor-pointer w-fit sm:w-auto disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Excel…
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
                  Download Monthly Sheet
                </>
              )}
            </button>
          )}
        </div>

        {/* ── Error & Success Banners ───────────────────────────────────────── */}
        {errorMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-auto cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="text-sm font-medium">{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="ml-auto cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Filters Card ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Subject Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Subject
              </label>
              <div className="relative">
                <button
                  onClick={() => setSubjectDropdownOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 hover:border-indigo-400 transition-colors cursor-pointer text-sm font-medium"
                >
                  <span>{selectedSubject?.name ?? "Select Subject…"}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform ${
                      subjectDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {subjectDropdownOpen && (
                  <div className="absolute z-20 mt-2 w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden">
                    {subjects.map((subject) => (
                      <button
                        key={subject.id}
                        onClick={() => {
                          setSelectedSubjectId(subject.id);
                          setSubjectDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors cursor-pointer
                          ${
                            selectedSubjectId === subject.id
                              ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                              : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                          }`}
                      >
                        {subject.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Date Picker */}
            <div className="space-y-1.5">
              <label
                htmlFor="records-date"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              >
                Date
              </label>
              <div className="relative">
                <input
                  id="records-date"
                  type="date"
                  value={selectedDate}
                  max={todayString()}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors cursor-pointer font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Panels ─────────────────────────────────────────────────── */}
        {!loading && records.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col items-center">
              <span className="text-xs text-zinc-500 font-medium">Present</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {totalPresent}
              </span>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col items-center">
              <span className="text-xs text-zinc-500 font-medium">Absent</span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {totalAbsent}
              </span>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col items-center">
              <span className="text-xs text-zinc-500 font-medium">Not Marked</span>
              <span className="text-2xl font-black text-zinc-400 mt-1">
                {totalNotMarked}
              </span>
            </div>
          </div>
        )}

        {/* ── Roster & Records Table ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Header & Search */}
          <div className="p-5 border-b border-zinc-150 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
              Student Attendance List
              {!loading && (
                <span className="text-xs font-normal text-zinc-400">
                  ({filteredRecords.length} / {records.length})
                </span>
              )}
            </h2>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search name or roll number…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-250 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-850 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {loading ? (
            /* ── Loading Spinner ── */
            <div className="p-16 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-zinc-500">Fetching records from database…</p>
            </div>
          ) : records.length === 0 ? (
            /* ── Empty State ── */
            <div className="p-16 text-center space-y-2">
              <p className="text-zinc-500 font-medium">No students enrolled in this subject.</p>
              <p className="text-xs text-zinc-400">
                Register students to this subject first to mark attendance.
              </p>
            </div>
          ) : (
            /* ── Student list table ── */
            <div className="divide-y divide-zinc-150 dark:divide-zinc-800">
              {/* Mark All Buttons */}
              <div className="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-850/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Bulk Actions</span>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleMarkAll("PRESENT")}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    All Present
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                  <button
                    onClick={() => handleMarkAll("ABSENT")}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    All Absent
                  </button>
                </div>
              </div>

              {filteredRecords.map((student, idx) => {
                const currentStatus = getComputedStatus(student);
                const isChanged = pendingChanges[student.id] !== undefined;

                return (
                  <div
                    key={student.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 transition-colors ${
                      isChanged
                        ? "bg-amber-50/20 dark:bg-amber-950/10 border-l-2 border-amber-500"
                        : "hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20"
                    }`}
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono text-zinc-400 w-5 text-right shrink-0">
                        {idx + 1}
                      </span>
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                          ${
                            currentStatus === "PRESENT"
                              ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                              : currentStatus === "ABSENT"
                              ? "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                          }`}
                      >
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold truncate max-w-[200px]">
                          {student.name}
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
                          {student.rollNumber}
                        </p>
                      </div>
                    </div>

                    {/* Controls & Badges */}
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      {/* Current Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          currentStatus === "PRESENT"
                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                            : currentStatus === "ABSENT"
                            ? "bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        {currentStatus === "PRESENT"
                          ? "Present"
                          : currentStatus === "ABSENT"
                          ? "Absent"
                          : "Not Marked"}
                      </span>

                      {/* Manual Toggles */}
                      <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-850 p-1 rounded-xl">
                        <button
                          onClick={() => handleStatusChange(student.id, "PRESENT")}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            currentStatus === "PRESENT"
                              ? "bg-emerald-500 text-white shadow-sm"
                              : "text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                          }`}
                          title="Mark Present"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(student.id, "ABSENT")}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            currentStatus === "ABSENT"
                              ? "bg-rose-500 text-white shadow-sm"
                              : "text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                          }`}
                          title="Mark Absent"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer / Save Bar ────────────────────────────────────────────── */}
        {Object.keys(pendingChanges).length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeInUp">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              ⚠️ You have unsaved changes for{" "}
              <strong className="font-bold">
                {Object.keys(pendingChanges).length} student(s)
              </strong>
              .
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleResetChanges}
                className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Reset Changes
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-sm shadow-md transition-all cursor-pointer hover:shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
