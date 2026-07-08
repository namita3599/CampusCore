"use client";

import { useState, useTransition } from "react";
import { uploadProfilePicture } from "@/app/actions/profile";

interface StudentData {
  id: number;
  name: string;
  branch: string;
  rollNumber: string | null;
  phone: string | null;
  guardianName: string | null;
  yearOfAdmission: number | null;
  bloodGroup: string | null;
  profilePictureUrl: string | null;
  user: {
    username: string;
    email: string | null;
  };
}

export default function ProfileClient({ student }: { student: StudentData }) {
  const [isPending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(student.profilePictureUrl);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Block files over 5MB before any upload attempt
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setMessage({
        type: "error",
        text: `File is too large (${fileSizeMB} MB). Please upload an image under ${MAX_FILE_SIZE_MB} MB.`,
      });
      // Reset the input so the user can pick again
      e.target.value = "";
      return;
    }

    // Show client side preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Auto submit form on file selection
    const formData = new FormData();
    formData.append("file", file);
    formData.append("studentId", student.id.toString());

    setMessage(null);

    startTransition(async () => {
      const res = await uploadProfilePicture(formData);
      if (res.success && res.url) {
        setPreviewUrl(res.url);
        setMessage({ type: "success", text: "Profile picture updated successfully!" });
      } else {
        setPreviewUrl(student.profilePictureUrl);
        setMessage({ type: "error", text: res.error || "Failed to upload profile picture." });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 animate-fadeInUp text-zinc-950 dark:text-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 font-semibold">Settings</p>
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">My Profile</h1>
        <p className="text-zinc-500 text-sm mt-1">Manage your identity details and profile picture.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Profile Picture Card */}
        <div className="md:col-span-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center space-y-6 shadow-sm">
          <div className="relative group w-32 h-32 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={student.name}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
            ) : (
              <span className="text-4xl text-zinc-400 dark:text-zinc-600 font-bold uppercase">
                {student.name.substring(0, 2)}
              </span>
            )}

            {isPending && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100">{student.name}</h2>
            <p className="text-xs text-zinc-500 font-mono">{student.rollNumber ?? "No Roll Number"}</p>
          </div>

          <div className="w-full">
            <label className="block">
              <span className="sr-only">Choose profile photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isPending}
                className="block w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white dark:file:bg-zinc-100 dark:file:text-zinc-950 hover:file:opacity-90 file:cursor-pointer disabled:file:opacity-50 disabled:file:cursor-not-allowed"
              />
            </label>
            <p className="text-[10px] text-zinc-400 mt-2">Maximum width 800px. Auto-converted to WebP.</p>
          </div>

          {message && (
            <div className={`w-full p-2.5 rounded-xl border text-xs text-left ${message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
              }`}>
              {message.text}
            </div>
          )}
        </div>

        {/* Detailed Info Card */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800/40 pb-3">
            Academic & Contact Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Branch</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1">{student.branch}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Year of Admission</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                {student.yearOfAdmission ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Email Address</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                {student.user.email ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Phone Number</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1">{student.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Guardian Name</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                {student.guardianName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Blood Group</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1">{student.bloodGroup ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
