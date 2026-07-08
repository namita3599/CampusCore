"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  markFeePaid,
  updateBatchFeeAmount,
  bulkResetFeesToUnpaid,
} from "@/app/dashboard/admin/actions";

interface FeeRecord {
  id: number;
  studentId: number;
  type: "TUITION" | "HOSTEL";
  amount: number;
  status: "PAID" | "UNPAID";
  term: string;
  paidAt: string | null;
  admissionYear: number;
  student: { name: string; rollNumber: string | null; user: { username: string } };
}

export default function AdminFeesClient({ feeRecords }: { feeRecords: FeeRecord[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"TUITION" | "HOSTEL">("TUITION");
  const [yearFilter, setYearFilter] = useState<string>("ALL");
  const [tuitionPaidFilter, setTuitionPaidFilter] = useState<"ALL" | "PAID" | "UNPAID">("ALL");
  const [isPending, startTransition] = useTransition();

  // 3-dots Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Batch edit modal state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchAmount, setBatchAmount] = useState("");
  const [batchTerm, setBatchTerm] = useState("");

  // Bulk reset modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTerm, setBulkTerm] = useState("");
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkType, setBulkType] = useState<"TUITION" | "HOSTEL">("TUITION");

  const tabRecords = feeRecords.filter((r) => r.type === activeTab);
  const admissionYears = [...new Set(tabRecords.map((r) => r.admissionYear))].sort((a, b) => b - a);
  const filtered = yearFilter === "ALL" ? tabRecords : tabRecords.filter((r) => r.admissionYear === Number(yearFilter));

  // Additional filter for tuition payment status
  const displayRecords =
    activeTab === "TUITION" && tuitionPaidFilter !== "ALL"
      ? filtered.filter((r) => r.status === tuitionPaidFilter)
      : filtered;

  const allTerms = [...new Set(tabRecords.map((r) => r.term))];
  const selectedYearNum = yearFilter === "ALL" ? null : Number(yearFilter);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleExportExcel = () => {
    if (displayRecords.length === 0) return;

    const dataToExport = displayRecords.map((r) => ({
      "Student Name": r.student.name,
      "Roll Number": r.student.rollNumber ?? "N/A",
      "Username": r.student.user.username,
      "Admission Year": r.admissionYear,
      "Fee Type": r.type,
      "Term": r.term,
      "Amount (₹)": r.amount,
      "Status": r.status,
      "Paid At": r.paidAt ? fmt(r.paidAt) : "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${activeTab}_Fees`);

    // Auto-fit column widths
    const maxLens = Object.keys(dataToExport[0] || {}).map((key) => {
      let maxLen = key.length;
      dataToExport.forEach((row: any) => {
        const valStr = String(row[key] ?? "");
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      });
      return { wch: maxLen + 3 };
    });
    worksheet["!cols"] = maxLens;

    XLSX.writeFile(workbook, `${activeTab.toLowerCase()}_fees_report.xlsx`);
  };

  return (
    <div className="p-8 space-y-7 animate-fadeInUp text-zinc-950 dark:text-zinc-50 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 font-semibold">Finance</p>
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">Fee Management</h1>
          <p className="text-zinc-500 text-sm mt-1">View, manage and reset student fee records.</p>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-950 flex items-center justify-center shadow-sm"
            title="More Options"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {isMenuOpen && (
            <>
              {/* Invisible full-screen backdrop to close menu on click outside */}
              <div className="fixed inset-0 z-30" onClick={() => setIsMenuOpen(false)} />
              
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg py-1.5 z-40 animate-fadeInUp">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    const confirmed = window.confirm("Are you sure you want to perform a bulk reset? This action will generate fee records for all students.");
                    if (confirmed) {
                      setBulkType(activeTab);
                      setShowBulkModal(true);
                    }
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-semibold cursor-pointer"
                >
                  New Term / Bulk Reset
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl p-1 w-fit">
        {(["TUITION", "HOSTEL"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setActiveTab(t);
              setYearFilter("ALL");
              setTuitionPaidFilter("ALL");
            }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === t
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {t === "TUITION" ? "Tuition Fees" : "Hostel Fees"}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Filter by Year:</label>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 cursor-pointer"
          >
            <option value="ALL">All Years</option>
            {admissionYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {activeTab === "TUITION" && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status:</label>
            <select
              value={tuitionPaidFilter}
              onChange={(e) => setTuitionPaidFilter(e.target.value as any)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid Only</option>
              <option value="UNPAID">Unpaid Only</option>
            </select>
          </div>
        )}

        <button
          onClick={handleExportExcel}
          disabled={displayRecords.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export Excel
        </button>

        <button
          onClick={() => {
            startTransition(() => {
              router.refresh();
            });
          }}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
        >
          <svg
            className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>

        {yearFilter !== "ALL" && (
          <button
            onClick={() => setShowBatchModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit Batch Amount — {yearFilter}
          </button>
        )}

        <span className="ml-auto text-xs text-zinc-400">
          {displayRecords.length} record{displayRecords.length !== 1 ? "s" : ""}
          {" · "}
          {displayRecords.filter((r) => r.status === "PAID").length} paid
          {" · "}
          {displayRecords.filter((r) => r.status === "UNPAID").length} unpaid
        </span>
      </div>

      {/* Table */}
      {displayRecords.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 p-14 text-center">
          <p className="text-zinc-400 text-sm">No fee records found. Use "New Term / Bulk Reset" to generate records for students.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                  {["Student", "Roll No.", "Admission Year", "Term", "Amount", "Status", "Paid At", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {displayRecords.map((r) => (
                  <tr key={r.id} className="bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{r.student.name}</td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs whitespace-nowrap">{r.student.rollNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{r.admissionYear}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap max-w-[160px] truncate">{r.term}</td>
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">₹{r.amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          r.status === "PAID"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${r.status === "PAID" ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">{r.paidAt ? fmt(r.paidAt) : "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {r.status === "UNPAID" && (
                          <button
                            disabled={isPending}
                            onClick={() => startTransition(() => markFeePaid(r.id))}
                            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900/40 transition-all cursor-pointer disabled:opacity-50"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Batch Edit Amount Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-7 w-full max-w-md mx-4">
            <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 mb-1">Edit Batch Fee Amount</h3>
            <p className="text-xs text-zinc-500 mb-5">Update the fee amount for all <strong>{activeTab.toLowerCase()}</strong> records in admission year <strong>{yearFilter}</strong>.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Term</label>
                <select
                  value={batchTerm}
                  onChange={(e) => setBatchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="">Select term…</option>
                  {allTerms.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">New Amount (₹)</label>
                <input
                  type="number"
                  value={batchAmount}
                  onChange={(e) => setBatchAmount(e.target.value)}
                  placeholder="e.g. 75000"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowBatchModal(false); setBatchAmount(""); setBatchTerm(""); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!batchAmount || !batchTerm || isPending}
                onClick={() => {
                  startTransition(async () => {
                    await updateBatchFeeAmount(selectedYearNum!, activeTab, Number(batchAmount), batchTerm);
                    setShowBatchModal(false);
                    setBatchAmount("");
                    setBatchTerm("");
                  });
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-sm font-semibold hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Updating…" : "Update Amount"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reset Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-7 w-full max-w-md mx-4">
            <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 mb-1">New Term / Bulk Reset to Unpaid</h3>
            <p className="text-xs text-zinc-500 mb-5">Creates or resets fee records to <strong>UNPAID</strong> for all students for the specified term.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Fee Type</label>
                <select
                  value={bulkType}
                  onChange={(e) => setBulkType(e.target.value as any)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="TUITION">Tuition Fee</option>
                  <option value="HOSTEL">Hostel Fee</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Term Name</label>
                <input
                  type="text"
                  value={bulkTerm}
                  onChange={(e) => setBulkTerm(e.target.value)}
                  placeholder="e.g. 2024-2025 Semester 1"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Default Amount (₹)</label>
                <input
                  type="number"
                  value={bulkAmount}
                  onChange={(e) => setBulkAmount(e.target.value)}
                  placeholder="e.g. 60000"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowBulkModal(false); setBulkTerm(""); setBulkAmount(""); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!bulkTerm || !bulkAmount || isPending}
                onClick={() => {
                  startTransition(async () => {
                    await bulkResetFeesToUnpaid(bulkType, bulkTerm, Number(bulkAmount));
                    setShowBulkModal(false);
                    setBulkTerm("");
                    setBulkAmount("");
                  });
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Processing…" : "Confirm Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
