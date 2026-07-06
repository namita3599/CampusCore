"use client";

import { useState } from "react";

type ExportType = "students" | "teachers" | "wardens" | "all";

interface Props {
  type: ExportType;
  label: string;
  /** "sm" = compact pill, "md" = slightly larger (default: "sm") */
  size?: "sm" | "md";
}

export default function ExportButton({ type, label, size = "sm" }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/export-users?type=${type}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : `CampusCore_${label}.xlsx`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const sizeClasses =
    size === "md"
      ? "rounded-xl px-4 py-2 text-sm"
      : "rounded-lg px-3 py-1.5 text-xs";

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 font-medium text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 hover:border-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed ${sizeClasses}`}
    >
      {loading ? (
        <>
          <svg
            className="h-3.5 w-3.5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Exporting…
        </>
      ) : (
        <>
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
            />
          </svg>
          Export {label}
        </>
      )}
    </button>
  );
}
