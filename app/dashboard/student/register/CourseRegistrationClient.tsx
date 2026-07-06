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
}

export default function CourseRegistrationClient({
  profileId,
  initialRegisteredIds,
  initialStatus,
  allSubjects,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>(initialRegisteredIds);
  const [registered, setRegistered] = useState(initialStatus);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleRegister = () => {
    startTransition(async () => {
      try {
        await registerSubjects(profileId, selectedSubjects);
        showMsg("success", "Subjects registered successfully!");
        setRegistered(true);
      } catch (e: any) {
        showMsg("error", e.message || "Failed to register subjects.");
      }
    });
  };

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

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">Select Courses</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Select the subjects you want to enroll in for this semester.</p>
          </div>
          {registered ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              ✓ Registered
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
          <p className="text-xs text-zinc-500">
            {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? "s" : ""} selected.
          </p>
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
    </div>
  );
}
