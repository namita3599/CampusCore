"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

type UserRoleType = "student" | "teacher" | "warden";

interface ErrorDetail {
  row: number;
  name: string;
  error: string;
}

interface UploadResponse {
  total: number;
  successCount: number;
  failCount: number;
  errors: ErrorDetail[];
}

export default function BulkUploadCard() {
  const [roleType, setRoleType] = useState<UserRoleType>("student");
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState<UploadResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTemplateDownload = async () => {
    try {
      const res = await fetch(`/api/admin/export-template?type=${roleType}`);
      if (!res.ok) throw new Error("Template export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : `${roleType}_template.xlsx`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download template. Please try again.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset old states
    setUploading(true);
    setReport(null);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", roleType);

    try {
      const res = await fetch("/api/admin/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse/upload bulk Excel.");
      }

      setReport(data);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during bulk upload.");
    } finally {
      setUploading(false);
      // Reset input element value to allow same-file selection again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-xl font-bold">
          📥
        </div>
        <div>
          <p className="font-semibold text-zinc-950">Bulk User Import</p>
          <p className="text-sm text-zinc-500 mt-0.5">
            Add multiple students, teachers, or wardens in one action using an Excel spreadsheet.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Select type */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">User Type to Import</label>
          <div className="flex gap-2 p-1 bg-zinc-100/80 rounded-xl max-w-md">
            {(["student", "teacher", "warden"] as UserRoleType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setRoleType(type);
                  setReport(null);
                  setErrorMsg(null);
                }}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-lg capitalize transition-all ${
                  roleType === type
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {type}s
              </button>
            ))}
          </div>
        </div>

        {/* Action triggers */}
        <div className="flex flex-wrap gap-3 items-center pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTemplateDownload}
            className="rounded-xl"
            suppressHydrationWarning
          >
            <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download {roleType} Template
          </Button>

          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls"
              className="hidden"
              id="bulk-excel-input"
            />
            <Button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl"
              suppressHydrationWarning
            >
              {uploading ? (
                <>
                  <svg className="h-4 w-4 mr-1.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Uploading &amp; Processing…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Excel File
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Global Error message */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Report Summary */}
      {report && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 space-y-4 animate-fadeInUp">
          <p className="font-semibold text-zinc-950 text-sm">Bulk Import Results Summary</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white border border-zinc-150 rounded-lg p-2.5 shadow-sm">
              <p className="text-xs font-semibold text-zinc-500">Total Rows</p>
              <p className="text-xl font-bold text-zinc-900 mt-0.5">{report.total}</p>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 shadow-sm">
              <p className="text-xs font-semibold text-emerald-600">Created</p>
              <p className="text-xl font-bold text-emerald-700 mt-0.5">{report.successCount}</p>
            </div>
            <div className={`rounded-lg p-2.5 border shadow-sm ${report.failCount > 0 ? "bg-rose-50/50 border-rose-100" : "bg-white border-zinc-150"}`}>
              <p className={`text-xs font-semibold ${report.failCount > 0 ? "text-rose-600" : "text-zinc-500"}`}>Failed/Skipped</p>
              <p className={`text-xl font-bold mt-0.5 ${report.failCount > 0 ? "text-rose-700" : "text-zinc-900"}`}>{report.failCount}</p>
            </div>
          </div>

          {report.errors.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Errors List:</p>
              <div className="max-h-56 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100 bg-white">
                {report.errors.map((err, idx) => (
                  <div key={idx} className="p-3 text-xs flex items-start gap-3">
                    <span className="font-mono text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                      Row {err.row}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-900 truncate">{err.name}</p>
                      <p className="text-rose-600 mt-0.5 font-medium">{err.error}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.successCount > 0 && report.failCount === 0 && (
            <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              All users imported and verified successfully!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
