"use client";

import { useState, useTransition, useRef } from "react";
import { createComplaint } from "@/actions/complaints";
import { AlertCircle, BookOpen, Home, CheckCircle, Clock, Plus, ChevronDown, ChevronUp } from "lucide-react";

interface Subject {
  id: number;
  name: string;
}

interface Hostel {
  id: number;
  name: string;
}

interface Complaint {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  subject: { id: number; name: string } | null;
  hostel: { id: number; name: string } | null;
}

interface Props {
  subjects: Subject[];
  hostel: Hostel | null;
  initialComplaints: Complaint[];
}

export default function StudentComplaintsClient({ subjects, hostel, initialComplaints }: Props) {
  const [category, setCategory] = useState<"COURSE" | "HOSTEL">("COURSE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id?.toString() ?? "");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  // For toggling resolution details in history
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!title.trim() || !description.trim()) {
      setErrorMsg("Title and description are required.");
      return;
    }

    if (category === "COURSE" && !subjectId) {
      setErrorMsg("Please select a subject.");
      return;
    }

    if (category === "HOSTEL" && !hostel) {
      setErrorMsg("You must be allocated to a hostel to file a hostel complaint.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    if (category === "COURSE") {
      formData.append("subjectId", subjectId);
    }

    startTransition(async () => {
      try {
        await createComplaint(formData);
        setSuccessMsg("Complaint submitted successfully!");
        setTitle("");
        setDescription("");
        formRef.current?.reset();
      } catch (err: any) {
        setErrorMsg(err.message || "Something went wrong.");
      }
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-zinc-950 animate-fadeInUp">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Student Portal</p>
        <h1 className="text-2xl font-bold text-zinc-950">Complaints & Tickets</h1>
        <p className="text-zinc-500 text-sm mt-1">Lodge course or hostel related issues. They will be routed directly to your Teacher or Warden.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lodge a Complaint Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm h-fit space-y-6">
          <h3 className="text-base font-bold text-zinc-900 pb-3 border-b border-zinc-100 flex items-center gap-2">
            <Plus className="h-5 w-5 text-zinc-400" />
            <span>Lodge a New Complaint</span>
          </h3>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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

            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Category</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCategory("COURSE");
                    setErrorMsg("");
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                    category === "COURSE"
                      ? "bg-zinc-950 border-zinc-950 text-white"
                      : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Course Related
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategory("HOSTEL");
                    setErrorMsg("");
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                    category === "HOSTEL"
                      ? "bg-zinc-950 border-zinc-950 text-white"
                      : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <Home className="h-3.5 w-3.5" />
                  Hostel Related
                </button>
              </div>
            </div>

            {/* Category Conditional rendering */}
            {category === "COURSE" ? (
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Select Subject</label>
                {subjects.length === 0 ? (
                  <p className="text-xs text-red-500 italic font-medium">You are not registered in any course subjects.</p>
                ) : (
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-white border border-zinc-200 text-zinc-950 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all cursor-pointer"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Allocated Hostel</label>
                {hostel ? (
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 flex items-center justify-between">
                    <span className="font-bold capitalize">🏢 {hostel.name}</span>
                    <span className="text-[10px] text-zinc-400 font-semibold">Automatic mapping</span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>No active hostel booking found. Hostel complaints are disabled.</p>
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Title</label>
              <input
                type="text"
                placeholder="e.g. Broken fan in room / Lecture link not accessible"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Detailed Description</label>
              <textarea
                rows={4}
                placeholder="Provide detailed information regarding the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isPending || (category === "COURSE" && subjects.length === 0) || (category === "HOSTEL" && !hostel)}
              className="w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending ? "Submitting..." : "Submit Complaint"}
            </button>
          </form>
        </div>

        {/* Complaints History List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-zinc-900 pb-3 border-b border-zinc-100 flex items-center gap-2">
            <Clock className="h-5 w-5 text-zinc-400" />
            <span>Complaint & Ticket History</span>
          </h3>

          {initialComplaints.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs italic">
              No historical complaints filed.
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {initialComplaints.map((complaint) => {
                const isExpanded = expandedId === complaint.id;
                const isResolved = complaint.status === "RESOLVED";

                return (
                  <div
                    key={complaint.id}
                    className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm"
                  >
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : complaint.id)}
                      className="p-4 bg-zinc-50 hover:bg-zinc-100/50 transition-colors flex justify-between items-start gap-4 cursor-pointer"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-zinc-900 truncate capitalize">
                            {complaint.title}
                          </h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            complaint.category === "COURSE"
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                              : "bg-amber-50 border-amber-200 text-amber-700"
                          }`}>
                            {complaint.category === "COURSE"
                              ? `📚 Course: ${complaint.subject?.name ?? "Subject"}`
                              : `🏢 Hostel: ${complaint.hostel?.name ?? "Hostel"}`}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 line-clamp-1">
                          {complaint.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
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
                      <div className="p-4 bg-white border-t border-zinc-100 space-y-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-zinc-400 font-semibold block uppercase text-[9px] tracking-wide">
                            Detailed Issue description
                          </span>
                          <p className="text-zinc-700 leading-relaxed font-medium whitespace-pre-wrap">
                            {complaint.description}
                          </p>
                          <span className="text-zinc-400 text-[10px] block mt-1">
                            Lodged on {new Date(complaint.createdAt).toLocaleDateString()} at {new Date(complaint.createdAt).toLocaleTimeString()}
                          </span>
                        </div>

                        {isResolved && (
                          <div className="p-3 bg-emerald-50/50 border border-emerald-150 rounded-xl space-y-1">
                            <span className="text-emerald-800 font-bold block uppercase text-[9px] tracking-wide">
                              Resolution Details
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
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
