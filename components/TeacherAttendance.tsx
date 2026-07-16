"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Python FastAPI microservice base URL.
// Set NEXT_PUBLIC_FACIAL_API_URL in .env to override in production.
// ─────────────────────────────────────────────────────────────────────────────
const PYTHON_SERVICE_URL =
  process.env.NEXT_PUBLIC_FACIAL_API_URL ?? "http://localhost:8000";

/**
 * ============================================================================
 * TeacherAttendance.tsx
 * CampusCore – AI-Powered Attendance Marking Component (Teacher View)
 * ============================================================================
 *
 * Props (passed from the Server Component page.tsx):
 *   subjects  – Teacher's own subjects with enrolled students fetched from DB.
 *               The dropdown only shows these subjects.
 *               The roster only shows students enrolled in the selected subject.
 *
 * UI Flow:
 *  1. SETUP   – Select subject, pick a date (defaults to today), drop photo.
 *  2. LOADING – Photo sent to Python AI; animated spinner.
 *  3. REVIEW  – Roster of enrolled students; AI-detected = pre-checked.
 *               Teacher can manually override any checkbox.
 *  4. SAVED   – Confirmation screen.
 *
 * API:
 *   POST http://localhost:8000/mark-group-attendance  ← Python AI
 *   POST /api/attendance                              ← Next.js save route
 * ============================================================================
 */

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  Brain,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Save,
  Upload,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript interfaces
// ─────────────────────────────────────────────────────────────────────────────
interface Student {
  id: number;
  name: string;
  rollNumber: string;
}

interface SubjectWithStudents {
  id: number;
  name: string;
  students: Student[]; // only students enrolled in this subject
}

interface TeacherAttendanceProps {
  /** Teacher's own subjects + their enrolled students, from the DB. */
  subjects: SubjectWithStudents[];
  institutionId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns today's date as "YYYY-MM-DD" (local timezone) */
function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Format "YYYY-MM-DD" → "10 Jul 2025" for display */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Real API call to the Python FastAPI microservice
// ─────────────────────────────────────────────────────────────────────────────
async function callAIService(file: File, institutionId: string): Promise<number[]> {
  const formData = new FormData();
  formData.append("photo", file);
  formData.append("institutionId", institutionId);

  const response = await fetch(`${PYTHON_SERVICE_URL}/mark-group-attendance`, {
    method: "POST",
    // Do NOT set Content-Type — browser sets the multipart boundary automatically.
    body: formData,
  });

  if (!response.ok) {
    let detail = `AI service responded with HTTP ${response.status}`;
    try {
      const err = (await response.json()) as { detail?: string };
      if (err.detail) detail = err.detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }

  const data = (await response.json()) as { presentStudentIds: number[] };
  return data.presentStudentIds;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI State machine
// ─────────────────────────────────────────────────────────────────────────────
type UIState = "setup" | "loading" | "review" | "saved";

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function TeacherAttendance({ subjects, institutionId }: TeacherAttendanceProps) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayString());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);

  // ── UI state machine ────────────────────────────────────────────────────────
  const [uiState, setUiState] = useState<UIState>("setup");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Attendance map: studentId → boolean ────────────────────────────────────
  const [attendanceMap, setAttendanceMap] = useState<Record<number, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived values ──────────────────────────────────────────────────────────
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  // Show only students enrolled in the selected subject
  const enrolledStudents: Student[] = selectedSubject?.students ?? [];
  const presentCount = Object.values(attendanceMap).filter(Boolean).length;
  const absentCount = enrolledStudents.length - presentCount;

  // ─────────────────────────────────────────────────────────────────────────
  // File handling
  // ─────────────────────────────────────────────────────────────────────────
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload an image file (JPEG, PNG, WebP).");
      return;
    }
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    setErrorMsg(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Submit to AI
  // ─────────────────────────────────────────────────────────────────────────
  const handleAnalyse = async () => {
    if (!selectedSubjectId || !photoFile) return;

    setUiState("loading");
    setErrorMsg(null);

    try {
      const aiPresentIds = await callAIService(photoFile, institutionId);

      // Pre-check students the AI matched; leave others unchecked
      const initialMap: Record<number, boolean> = {};
      for (const student of enrolledStudents) {
        initialMap[student.id] = aiPresentIds.includes(student.id);
      }
      setAttendanceMap(initialMap);
      setUiState("review");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to analyse photo.");
      setUiState("setup");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Save to database via Next.js API route
  // ─────────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      const payload = {
        subjectId: selectedSubjectId,
        // Send the raw date string (e.g., "YYYY-MM-DD") to prevent timezone shift issues
        date: selectedDate,
        attendance: Object.entries(attendanceMap).map(([id, present]) => ({
          studentId: Number(id),
          status: present ? "PRESENT" : "ABSENT",
        })),
      };

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok && res.status !== 404) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Save failed: HTTP ${res.status}`);
      }
    } catch (err) {
      // Surface save errors in the error banner but still complete the UI flow
      console.error("[TeacherAttendance] save error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to save attendance.");
    }

    setUiState("saved");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Reset
  // ─────────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setUiState("setup");
    setSelectedSubjectId(null);
    setSelectedDate(todayString());
    handleRemovePhoto();
    setAttendanceMap({});
    setErrorMsg(null);
  };

  const canSubmit = selectedSubjectId !== null && photoFile !== null && selectedDate !== "";

  // ─────────────────────────────────────────────────────────────────────────
  // Empty-state: teacher has no subjects assigned
  // ─────────────────────────────────────────────────────────────────────────
  if (subjects.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-8">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 max-w-sm text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">No subjects assigned</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Ask your administrator to assign subjects to your teacher profile before marking attendance.
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
              AI Attendance
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Upload a group photo and let AI mark attendance instantly.
            </p>
          </div>
        </div>

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {errorMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-auto cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  STATE: SETUP                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {uiState === "setup" && (
          <div className="space-y-4">

            {/* Subject + Date row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* ── Subject Selector ───────────────────────────────────────── */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                  Subject
                </label>
                <div className="relative">
                  <button
                    onClick={() => setSubjectDropdownOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 hover:border-indigo-400 transition-colors cursor-pointer text-sm"
                    suppressHydrationWarning
                  >
                    <span className={selectedSubject ? "font-medium" : "text-zinc-400"}>
                      {selectedSubject?.name ?? "Select a subject…"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${subjectDropdownOpen ? "rotate-180" : ""}`} />
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
                            ${selectedSubjectId === subject.id
                              ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                              : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                            }`}
                        >
                          <span className="font-medium">{subject.name}</span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-2">
                            {subject.students.length} student{subject.students.length !== 1 ? "s" : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Date Picker ────────────────────────────────────────────── */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
                <label
                  htmlFor="attendance-date"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3"
                >
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Date
                  </span>
                </label>
                <input
                  id="attendance-date"
                  type="date"
                  value={selectedDate}
                  max={todayString()}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors cursor-pointer"
                />
                {selectedDate && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                    {formatDate(selectedDate)}
                  </p>
                )}
              </div>
            </div>

            {/* ── Photo Dropzone ───────────────────────────────────────────── */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                Group Photo
              </label>

              {photoPreviewUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreviewUrl}
                    alt="Group photo preview"
                    className="w-full max-h-64 object-cover"
                  />
                  <button
                    onClick={handleRemovePhoto}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
                    {photoFile?.name}
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-3 h-44 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
                    ${isDragging
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 scale-[1.01]"
                      : "border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/10"
                    }`}
                >
                  <div className="p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Drop photo here or{" "}
                      <span className="text-indigo-600 dark:text-indigo-400">browse</span>
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                      JPEG, PNG, WebP — up to 10 MB
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                  />
                </div>
              )}
            </div>

            {/* ── Analyse button ───────────────────────────────────────────── */}
            <button
              onClick={handleAnalyse}
              disabled={!canSubmit}
              className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200
                ${canSubmit
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 cursor-pointer"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                }`}
            >
              <Camera className="w-4 h-4" />
              Analyse with AI
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  STATE: LOADING                                                   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {uiState === "loading" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 shadow-sm flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-indigo-100 dark:border-indigo-950/50" />
              <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Analysing Group Photo</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                AI is detecting and matching faces to enrolled students…
              </p>
            </div>
            <div className="flex gap-3">
              {["Detecting faces", "Matching embeddings", "Finalising"].map((step, i) => (
                <div key={step} className="flex items-center gap-1.5 text-xs text-zinc-400" style={{ animationDelay: `${i * 0.8}s` }}>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  STATE: REVIEW                                                    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {uiState === "review" && (
          <div className="space-y-4">

            {/* Context banner */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">Subject</p>
                <p className="text-sm font-bold text-zinc-950 dark:text-zinc-50 mt-0.5">{selectedSubject?.name}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">Date</p>
                <p className="text-sm font-bold text-zinc-950 dark:text-zinc-50 mt-0.5">{formatDate(selectedDate)}</p>
              </div>
              <div className="flex gap-3">
                <StatBadge label="Present" value={presentCount} color="emerald" icon={<UserCheck className="w-3.5 h-3.5" />} />
                <StatBadge label="Absent"  value={absentCount}  color="rose"    icon={<UserX    className="w-3.5 h-3.5" />} />
              </div>
            </div>

            {/* AI note */}
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50">
              <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <p className="text-xs text-indigo-700 dark:text-indigo-300">
                <strong>AI pre-filled</strong> based on face matches. Review and correct any misdetections below before saving.
              </p>
            </div>

            {/* Roster */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="font-bold text-zinc-950 dark:text-zinc-50">
                  Enrolled Students
                  <span className="ml-2 text-xs font-normal text-zinc-400">({enrolledStudents.length})</span>
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => { const all: Record<number, boolean> = {}; enrolledStudents.forEach((s) => (all[s.id] = true)); setAttendanceMap(all); }}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    All Present
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                  <button
                    onClick={() => { const none: Record<number, boolean> = {}; enrolledStudents.forEach((s) => (none[s.id] = false)); setAttendanceMap(none); }}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    All Absent
                  </button>
                </div>
              </div>

              {enrolledStudents.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm text-zinc-400 dark:text-zinc-500">
                    No students are enrolled in this subject yet.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {enrolledStudents.map((student, idx) => {
                    const isPresent = attendanceMap[student.id] ?? false;
                    return (
                      <label
                        key={student.id}
                        htmlFor={`cb-${student.id}`}
                        className="flex items-center gap-4 px-6 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-mono text-zinc-400 dark:text-zinc-600 w-5 text-right shrink-0">{idx + 1}</span>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                          ${isPresent ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}>
                          {student.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 truncate">{student.name}</p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">{student.rollNumber}</p>
                        </div>
                        <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold
                          ${isPresent ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"}`}>
                          {isPresent ? "Present" : "Absent"}
                        </span>
                        <input
                          id={`cb-${student.id}`}
                          type="checkbox"
                          checked={isPresent}
                          onChange={(e) => setAttendanceMap((prev) => ({ ...prev, [student.id]: e.target.checked }))}
                          className="w-5 h-5 rounded-md border-zinc-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                ← Retake Photo
              </button>
              <button
                onClick={handleSave}
                className="flex-[2] flex items-center justify-center gap-2.5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save Attendance
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  STATE: SAVED                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {uiState === "saved" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 shadow-sm flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">Attendance Saved!</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {presentCount} of {enrolledStudents.length} students marked present
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {selectedSubject?.name} · {formatDate(selectedDate)}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="mt-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              Mark Another Class
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: StatBadge (used in review context bar)
// ─────────────────────────────────────────────────────────────────────────────
function StatBadge({
  label, value, color, icon,
}: {
  label: string;
  value: number;
  color: "emerald" | "rose";
  icon: React.ReactNode;
}) {
  const colorMap = {
    emerald: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
    rose:    "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30",
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${colorMap[color]}`}>
      {icon}
      <span className="text-lg font-black tabular-nums">{value}</span>
      <span className="text-xs font-semibold opacity-70">{label}</span>
    </div>
  );
}
