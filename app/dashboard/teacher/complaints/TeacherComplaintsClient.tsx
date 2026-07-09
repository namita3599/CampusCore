"use client";

import { useState, useTransition } from "react";
import { resolveComplaint } from "@/actions/complaints";
import { CheckCircle, Clock, AlertCircle, MessageSquare, Filter, ChevronDown, ChevronUp } from "lucide-react";

interface Complaint {
  id: number;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  student: {
    id: number;
    name: string;
    rollNumber: string | null;
    branch: string;
  };
  subject: { id: number; name: string } | null;
}

interface Props {
  initialComplaints: Complaint[];
}

export default function TeacherComplaintsClient({ initialComplaints }: Props) {
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "RESOLVED">("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredComplaints = initialComplaints.filter((c) => {
    if (filter === "PENDING") return c.status === "PENDING";
    if (filter === "RESOLVED") return c.status === "RESOLVED";
    return true;
  });

  const handleResolveSubmit = (e: React.FormEvent<HTMLFormElement>, complaintId: number) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!resolutionText.trim()) {
      setErrorMsg("Resolution feedback cannot be empty.");
      return;
    }

    const formData = new FormData();
    formData.append("complaintId", complaintId.toString());
    formData.append("resolution", resolutionText);

    startTransition(async () => {
      try {
        await resolveComplaint(formData);
        setSuccessMsg("Complaint resolved successfully!");
        setResolutionText("");
        setExpandedId(null);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to resolve complaint.");
      }
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-zinc-950 animate-fadeInUp">
      {/* Header */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Teacher Portal</p>
          <h1 className="text-2xl font-bold text-zinc-950">Student Course Complaints</h1>
          <p className="text-zinc-500 text-sm mt-1">Review and resolve academic complaints submitted by students for your subjects.</p>
        </div>

        {/* Tab Filters */}
        <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-semibold">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "ALL" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"
            }`}
          >
            All ({initialComplaints.length})
          </button>
          <button
            onClick={() => setFilter("PENDING")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "PENDING" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"
            }`}
          >
            Pending ({initialComplaints.filter((c) => c.status === "PENDING").length})
          </button>
          <button
            onClick={() => setFilter("RESOLVED")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "RESOLVED" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"
            }`}
          >
            Resolved ({initialComplaints.filter((c) => c.status === "RESOLVED").length})
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tickets List */}
      {filteredComplaints.length === 0 ? (
        <div className="text-center py-16 bg-white border border-zinc-200 rounded-2xl text-zinc-400 text-xs italic shadow-sm">
          No complaints found matching this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((complaint) => {
            const isExpanded = expandedId === complaint.id;
            const isResolved = complaint.status === "RESOLVED";

            return (
              <div
                key={complaint.id}
                className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm"
              >
                <div
                  onClick={() => {
                    setExpandedId(isExpanded ? null : complaint.id);
                    setResolutionText("");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="p-5 flex justify-between items-start gap-4 flex-wrap sm:flex-nowrap cursor-pointer hover:bg-zinc-50/50 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-zinc-900 capitalize truncate">
                        {complaint.title}
                      </h4>
                      <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                        📚 {complaint.subject?.name}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-500 font-medium flex items-center gap-1.5 flex-wrap">
                      <span className="text-zinc-800 font-bold">{complaint.student.name}</span>
                      {complaint.student.rollNumber && (
                        <>
                          <span className="text-zinc-300">|</span>
                          <span className="font-mono">{complaint.student.rollNumber}</span>
                        </>
                      )}
                      <span className="text-zinc-300">|</span>
                      <span>Branch: {complaint.student.branch}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-center sm:self-auto shrink-0">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isResolved
                        ? "bg-emerald-50 border-emerald-250 text-emerald-700"
                        : "bg-amber-50 border-amber-250 text-amber-700"
                    }`}>
                      {isResolved ? (
                        <>
                          <CheckCircle className="h-3 w-3 shrink-0" /> Resolved
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 shrink-0" /> Pending
                        </>
                      )}
                    </span>

                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-5 bg-zinc-50/50 border-t border-zinc-150 space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <span className="text-zinc-400 font-bold block uppercase text-[9px] tracking-wider">
                        Detailed Complaint Description
                      </span>
                      <p className="text-zinc-800 leading-relaxed font-medium bg-white border border-zinc-200 rounded-xl p-4 shadow-sm whitespace-pre-wrap">
                        {complaint.description}
                      </p>
                      <span className="text-zinc-400 text-[10px] block mt-1">
                        Lodged on {new Date(complaint.createdAt).toLocaleDateString()} at {new Date(complaint.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    {isResolved ? (
                      <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1">
                        <span className="text-emerald-800 font-bold block uppercase text-[9px] tracking-wide">
                          Resolution Notes
                        </span>
                        <p className="text-zinc-800 font-medium whitespace-pre-wrap">
                          {complaint.resolution}
                        </p>
                        {complaint.resolvedAt && (
                          <span className="text-zinc-400 text-[10px] block mt-1">
                            Resolved on {new Date(complaint.resolvedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={(e) => handleResolveSubmit(e, complaint.id)} className="space-y-3 pt-2">
                        <label className="block text-xs font-bold text-zinc-700">Provide Resolution Feedback</label>
                        <textarea
                          rows={3}
                          value={resolutionText}
                          onChange={(e) => setResolutionText(e.target.value)}
                          placeholder="Provide explanation, actions taken, or steps to resolve..."
                          required
                          className="w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all resize-none shadow-sm"
                        />
                        <button
                          type="submit"
                          disabled={isPending}
                          className="rounded-xl bg-zinc-950 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 cursor-pointer"
                        >
                          {isPending ? "Submitting..." : "Mark as Resolved"}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
