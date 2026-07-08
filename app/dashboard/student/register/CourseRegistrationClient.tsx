"use client";

import { useState, useTransition } from "react";
import { registerSubjects } from "../actions";
import { Button } from "@/components/ui/button";

type Subject = { id: number; name: string };

interface Props {
  profileId: number;
  initialRegisteredIds: number[];
  initialStatus: boolean;
  allSubjects: Subject[];
  isLocked: boolean;
}

export default function CourseRegistrationClient({
  profileId,
  initialRegisteredIds,
  initialStatus,
  allSubjects,
  isLocked,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>(initialRegisteredIds);
  const [registered, setRegistered] = useState(initialStatus);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleRegister = () => {
    startTransition(async () => {
      try {
        await registerSubjects(profileId, selectedSubjects);
        showMsg("success", "Subjects updated successfully!");
        setRegistered(true);
        setIsEditing(false);
      } catch (e: any) {
        showMsg("error", e.message || "Failed to register subjects.");
      }
    });
  };

  // Get subject objects that are currently registered
  const registeredSubjects = allSubjects.filter((s) => selectedSubjects.includes(s.id));

  // Determine if we should show the completed view
  const showCompletedView = registered && !isEditing;

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          message.type === "success"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-red-50 text-red-700 border-red-200"
        }`}>
          {message.type === "success" ? "✅" : "❌"} {message.text}
        </div>
      )}

      {showCompletedView ? (
        // ─── READ-ONLY COMPLETED VIEW ───────────────────────────
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm space-y-6 animate-fadeInUp">
          <div className="text-center space-y-2 pb-6 border-b border-zinc-100">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-2xl">
              ✓
            </div>
            <h2 className="text-xl font-bold text-zinc-950">Registration Complete</h2>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">
              Your course registration has been submitted and is active for the current semester.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Enrolled Courses</h3>
            {registeredSubjects.length === 0 ? (
              <p className="text-sm text-zinc-500 italic">No courses selected.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {registeredSubjects.map((subj) => (
                  <div
                    key={subj.id}
                    className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-800 flex items-center gap-2"
                  >
                    <span className="text-emerald-500">•</span>
                    {subj.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {isLocked ? (
              <div className="flex items-center gap-2 text-zinc-500 text-xs bg-zinc-50 border border-zinc-200 px-4 py-2.5 rounded-xl">
                <span>🔒</span>
                <span>Registration is locked by admin. Courses cannot be edited.</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-zinc-500">
                  Need to change your subjects? Click edit to adjust your selections.
                </p>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="rounded-xl border-zinc-300 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                >
                  📝 Edit Registration
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        // ─── EDITABLE SELECTION VIEW ───────────────────────────
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">Select Courses</h2>
              <p className="text-sm text-zinc-500 mt-0.5">Select the subjects you want to enroll in for this semester.</p>
            </div>
            {registered ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                ✓ Editing Active
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                ⏳ Pending Registration
              </span>
            )}
          </div>

          {allSubjects.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">No subjects available in the system yet. Contact the admin.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allSubjects.map((subj) => {
                const checked = selectedSubjects.includes(subj.id);
                return (
                  <label
                    key={subj.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      checked
                        ? "bg-zinc-50 border-zinc-300 text-zinc-950 font-medium"
                        : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedSubjects((prev) =>
                          e.target.checked ? [...prev, subj.id] : prev.filter((id) => id !== subj.id)
                        );
                      }}
                      className="accent-indigo-500 w-4 h-4"
                    />
                    <span className="text-sm">{subj.name}</span>
                  </label>
                );
              })}
            </div>
          )}

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
            <div className="flex gap-2">
              <p className="text-xs text-zinc-500 self-center">
                {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? "s" : ""} selected.
              </p>
              {registered && (
                <button
                  onClick={() => {
                    setSelectedSubjects(initialRegisteredIds);
                    setIsEditing(false);
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-900 underline ml-2"
                >
                  Cancel
                </button>
              )}
            </div>
            <Button
              onClick={handleRegister}
              disabled={isPending || selectedSubjects.length === 0}
              className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl"
              suppressHydrationWarning
            >
              {isPending ? "Submitting Registration..." : "Save Registration"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
