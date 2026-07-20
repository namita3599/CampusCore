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
 *  1. SETUP   – Select subject, pick a date, upload 1-N group photos.
 *  2. LOADING – All photos sent to Python AI in parallel; per-photo progress.
 *  3. REVIEW  – Roster of enrolled students; union of all AI detections = present.
 *               Teacher can manually override any checkbox.
 *  4. SAVED   – Confirmation screen.
 *
 * Multi-photo union rule:
 *   If a student is detected as PRESENT in ANY photo they stay PRESENT —
 *   absence in one photo never overrides a detection in another photo.
 *
 * API:
 *   POST http://localhost:8000/mark-group-attendance  ← Python AI (one call per photo)
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
  Images,
  Loader2,
  Plus,
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

/** Per-photo processing status shown during the loading screen */
type PhotoStatus = "pending" | "processing" | "done" | "error";

interface PhotoEntry {
  file: File;
  previewUrl: string;
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

  // Face recognition is CPU-intensive — allow up to 3 minutes on slow machines.
  // upsample=1 (the new default) typically finishes in 20-30 s on a laptop.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000);

  let response: Response;
  try {
    response = await fetch(`${PYTHON_SERVICE_URL}/mark-group-attendance`, {
      method: "POST",
      // Do NOT set Content-Type — browser sets the multipart boundary automatically.
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        "The AI service took too long to respond (> 3 min). " +
        "Try a smaller/lower-resolution photo, or restart the Python service."
      );
    }
    throw new Error(
      `Could not reach the AI service at ${PYTHON_SERVICE_URL}. ` +
      "Make sure the Python service is running (npm run dev starts it automatically)."
    );
  } finally {
    clearTimeout(timeoutId);
  }

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
  /** List of uploaded photos (file + object-URL preview). */
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);

  // ── UI state machine ────────────────────────────────────────────────────────
  const [uiState, setUiState] = useState<UIState>("setup");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Per-photo processing statuses (shown during loading screen) ─────────────
  const [photoStatuses, setPhotoStatuses] = useState<PhotoStatus[]>([]);

  // ── Attendance map: studentId → boolean ────────────────────────────────────
  const [attendanceMap, setAttendanceMap] = useState<Record<number, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived values ──────────────────────────────────────────────────────────
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const enrolledStudents: Student[] = selectedSubject?.students ?? [];
  const presentCount = Object.values(attendanceMap).filter(Boolean).length;
  const absentCount = enrolledStudents.length - presentCount;

  // ─────────────────────────────────────────────────────────────────────────
  // File handling
  // ─────────────────────────────────────────────────────────────────────────

  /** Validate and append new files, ignoring duplicates (by name+size). */
  const handleFilesAdded = useCallback((incoming: FileList | File[]) => {
    const files = Array.from(incoming);
    let skipped = 0;

    setPhotos((prev) => {
      const existingKeys = new Set(prev.map((p) => `${p.file.name}-${p.file.size}`));
      const toAdd: PhotoEntry[] = [];

      for (const file of files) {
        if (!file.type.startsWith("image/")) { skipped++; continue; }
        const key = `${file.name}-${file.size}`;
        if (existingKeys.has(key)) continue; // already in list
        toAdd.push({ file, previewUrl: URL.createObjectURL(file) });
        existingKeys.add(key);
      }

      return [...prev, ...toAdd];
    });

    if (skipped > 0) {
      setErrorMsg(`${skipped} file(s) skipped — only JPEG, PNG, and WebP images are accepted.`);
    } else {
      setErrorMsg(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) handleFilesAdded(e.dataTransfer.files);
    },
    [handleFilesAdded],
  );

  /** Remove a single photo by index, revoking its object URL. */
  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /** Remove all photos and reset file input. */
  const handleClearAll = () => {
    setPhotos((prev) => { prev.forEach((p) => URL.revokeObjectURL(p.previewUrl)); return []; });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Submit to AI — photos processed one at a time, union-merge results
  // ─────────────────────────────────────────────────────────────────────────
  const handleAnalyse = async () => {
    if (!selectedSubjectId || photos.length === 0) return;

    setUiState("loading");
    setErrorMsg(null);

    // ── Process photos sequentially ──────────────────────────────────────────
    // Face recognition is CPU-bound on the Python side — running two photos in
    // parallel just doubles memory usage and crashes the single uvicorn worker.
    // Sequential processing is more reliable and still shows per-photo progress.
    const unionPresentIds = new Set<number>();
    const errors: string[] = [];
    const finalStatuses: PhotoStatus[] = photos.map(() => "pending");
    setPhotoStatuses([...finalStatuses]);

    for (let idx = 0; idx < photos.length; idx++) {
      const entry = photos[idx];

      // Mark current photo as processing
      finalStatuses[idx] = "processing";
      setPhotoStatuses([...finalStatuses]);

      try {
        const ids = await callAIService(entry.file, institutionId);
        ids.forEach((id) => unionPresentIds.add(id));
        finalStatuses[idx] = "done";
      } catch (err) {
        errors.push(`Photo ${idx + 1}: ${err instanceof Error ? err.message : "Failed"}`);
        finalStatuses[idx] = "error";
      }

      setPhotoStatuses([...finalStatuses]);
    }

    // If ALL photos failed, go back to setup with an error
    if (errors.length === photos.length) {
      setErrorMsg(errors[0] ?? "All photos failed to analyse.");
      setUiState("setup");
      return;
    }

    // Partial success is fine — build the attendance map from the union
    if (errors.length > 0) {
      setErrorMsg(`${errors.length} photo(s) could not be analysed and were skipped.`);
    }

    // Pre-check students detected in ANY photo; leave others unchecked
    const initialMap: Record<number, boolean> = {};
    for (const student of enrolledStudents) {
      initialMap[student.id] = unionPresentIds.has(student.id);
    }
    setAttendanceMap(initialMap);
    setUiState("review");
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
    handleClearAll();
    setAttendanceMap({});
    setPhotoStatuses([]);
    setErrorMsg(null);
  };

  const canSubmit = selectedSubjectId !== null && photos.length > 0 && selectedDate !== "";

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
              Upload one or more group photos — AI marks attendance from all of them at once.
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

            {/* ── Photo Upload Zone ─────────────────────────────────────────── */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Images className="w-3.5 h-3.5" />
                  Group Photos
                  {photos.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold tabular-nums">
                      {photos.length}
                    </span>
                  )}
                </label>
                {photos.length > 1 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {photos.length === 0 ? (
                /* ── Empty drop zone ── */
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
                      Drop photos here or{" "}
                      <span className="text-indigo-600 dark:text-indigo-400">browse</span>
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                      JPEG, PNG, WebP — select multiple files at once
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => { if (e.target.files?.length) handleFilesAdded(e.target.files); }}
                  />
                </div>
              ) : (
                /* ── Photo thumbnail grid ── */
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`transition-all duration-200 rounded-xl ${isDragging ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-900" : ""}`}
                >
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {photos.map((photo, idx) => (
                      <div key={`${photo.file.name}-${photo.file.size}-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.previewUrl}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Remove button */}
                        <button
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {/* Index badge */}
                        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold">
                          {idx + 1}
                        </div>
                      </div>
                    ))}

                    {/* ── Add more tile ── */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/10 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer group"
                      title="Add more photos"
                    >
                      <Plus className="w-5 h-5 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                      <span className="text-[10px] font-semibold text-zinc-400 group-hover:text-indigo-500 transition-colors">Add more</span>
                    </button>

                    {/* Hidden multi-file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => { if (e.target.files?.length) handleFilesAdded(e.target.files); }}
                    />
                  </div>

                  {/* Drag-here hint when grid is visible */}
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 text-center mt-3">
                    Drag & drop more photos anywhere here, or click &ldquo;Add more&rdquo;
                  </p>
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
              {photos.length <= 1
                ? "Analyse with AI"
                : `Analyse ${photos.length} Photos with AI`}
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  STATE: LOADING                                                   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {uiState === "loading" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 shadow-sm flex flex-col items-center gap-6">
            {/* Spinner */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-indigo-100 dark:border-indigo-950/50" />
              <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <p className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Analysing Group Photos</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {photos.length > 1
                  ? `Processing ${photos.length} photos one at a time…`
                  : "AI is detecting and matching faces to enrolled students…"}
              </p>
            </div>

            {/* Per-photo progress list */}
            {photos.length > 0 && (
              <div className="w-full max-w-xs space-y-2">
                {photos.map((photo, idx) => {
                  const status = photoStatuses[idx] ?? "pending";
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      {/* Status icon */}
                      <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                        {status === "done" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        {status === "error" && (
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                        )}
                        {(status === "processing") && (
                          <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                        )}
                        {status === "pending" && (
                          <div className="w-3 h-3 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />
                        )}
                      </div>

                      {/* Photo name + bar */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                          Photo {idx + 1}
                          <span className="text-zinc-400 dark:text-zinc-600 font-normal ml-1">
                            ({photo.file.name})
                          </span>
                        </p>
                        <div className="mt-1 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500
                              ${status === "done" ? "w-full bg-emerald-500" : ""}
                              ${status === "error" ? "w-full bg-rose-500" : ""}
                              ${status === "processing" ? "w-2/3 bg-indigo-500 animate-pulse" : ""}
                              ${status === "pending" ? "w-0" : ""}
                            `}
                          />
                        </div>
                      </div>

                      {/* Status label */}
                      <span className={`text-[10px] font-semibold shrink-0
                        ${status === "done" ? "text-emerald-600 dark:text-emerald-400" : ""}
                        ${status === "error" ? "text-rose-600 dark:text-rose-400" : ""}
                        ${status === "processing" ? "text-indigo-600 dark:text-indigo-400" : ""}
                        ${status === "pending" ? "text-zinc-400" : ""}
                      `}>
                        {status === "done" ? "Done" : status === "error" ? "Error" : status === "processing" ? "Scanning…" : "Waiting"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step labels */}
            <div className="flex gap-4 flex-wrap justify-center">
              {["Detecting faces", "Matching embeddings", "Merging results"].map((step, i) => (
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
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">Photos</p>
                <p className="text-sm font-bold text-zinc-950 dark:text-zinc-50 mt-0.5">{photos.length}</p>
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
                <strong>AI pre-filled</strong> from {photos.length} photo{photos.length !== 1 ? "s" : ""}. A student detected in <em>any</em> photo stays Present. Review and correct misdetections below before saving.
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
                ← Retake Photos
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
                {selectedSubject?.name} · {formatDate(selectedDate)} · {photos.length} photo{photos.length !== 1 ? "s" : ""} analysed
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
