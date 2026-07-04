"use client";

import { useState, useTransition } from "react";
import { createStudent, createTeacher, createWarden, createSubject, createHostel } from "../actions";

type Subject = { id: number; name: string };
type Hostel = { id: number; name: string };

type Props = {
  subjects: Subject[];
  hostels: Hostel[];
};

type Tab = "student" | "teacher" | "warden" | "subject" | "hostel";

const tabs: { key: Tab; label: string; emoji: string }[] = [
  { key: "student", label: "Student", emoji: "👨‍🎓" },
  { key: "teacher", label: "Teacher", emoji: "👩‍🏫" },
  { key: "warden", label: "Warden", emoji: "🏠" },
  { key: "subject", label: "Subject", emoji: "📚" },
  { key: "hostel", label: "Hostel", emoji: "🏛️" },
];

export default function CreateUserModal({ subjects, hostels }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("student");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        if (activeTab === "student") await createStudent(formData);
        else if (activeTab === "teacher") await createTeacher(formData);
        else if (activeTab === "warden") await createWarden(formData);
        else if (activeTab === "subject") await createSubject(formData);
        else if (activeTab === "hostel") await createHostel(formData);

        setMessage({ type: "success", text: "Created successfully!" });
        (e.target as HTMLFormElement).reset();
        setTimeout(() => setIsOpen(false), 1200);
      } catch (err: any) {
        setMessage({ type: "error", text: err.message ?? "Something went wrong." });
      }
    });
  };

  const inputCls = "w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";
  const labelCls = "block text-sm font-medium text-slate-300 mb-1.5";

  return (
    <>
      <button
        id="open-create-modal-btn"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create New
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg glass rounded-2xl shadow-2xl border border-white/10 p-6 animate-fadeInUp">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Create New Entry</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 p-1 bg-white/5 rounded-xl">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setMessage(null); }}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-all ${
                    activeTab === tab.key
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.emoji} {tab.label}
                </button>
              ))}
            </div>

            {/* Message */}
            {message && (
              <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm border ${
                message.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Student Fields */}
              {activeTab === "student" && (
                <>
                  <div><label className={labelCls}>Full Name</label><input name="name" placeholder="e.g. Rahul Gupta" required className={inputCls} /></div>
                  <div><label className={labelCls}>Username</label><input name="username" placeholder="e.g. rahul_gupta" required className={inputCls} /></div>
                  <div><label className={labelCls}>Password</label><input name="password" type="password" placeholder="Minimum 6 characters" required className={inputCls} /></div>
                  <div><label className={labelCls}>Branch</label>
                    <select name="branch" required className={inputCls}>
                      <option value="" className="bg-slate-800">Select branch</option>
                      {["Computer Science", "Mechanical", "Civil", "Electronics", "Chemical", "Information Technology"].map(b => (
                        <option key={b} value={b} className="bg-slate-800">{b}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Teacher Fields */}
              {activeTab === "teacher" && (
                <>
                  <div><label className={labelCls}>Full Name</label><input name="name" placeholder="e.g. Dr. Sharma" required className={inputCls} /></div>
                  <div><label className={labelCls}>Username</label><input name="username" placeholder="e.g. teacher_sharma" required className={inputCls} /></div>
                  <div><label className={labelCls}>Password</label><input name="password" type="password" placeholder="Minimum 6 characters" required className={inputCls} /></div>
                  <div><label className={labelCls}>Assign Subject (optional)</label>
                    <select name="subjectId" className={inputCls}>
                      <option value="" className="bg-slate-800">— None —</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id} className="bg-slate-800">{s.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Warden Fields */}
              {activeTab === "warden" && (
                <>
                  <div><label className={labelCls}>Full Name</label><input name="name" placeholder="e.g. Mrs. Kapoor" required className={inputCls} /></div>
                  <div><label className={labelCls}>Username</label><input name="username" placeholder="e.g. warden_kapoor" required className={inputCls} /></div>
                  <div><label className={labelCls}>Password</label><input name="password" type="password" placeholder="Minimum 6 characters" required className={inputCls} /></div>
                  <div><label className={labelCls}>Assign Hostel (optional)</label>
                    <select name="hostelId" className={inputCls}>
                      <option value="" className="bg-slate-800">— None —</option>
                      {hostels.map(h => (
                        <option key={h.id} value={h.id} className="bg-slate-800">{h.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Subject Field */}
              {activeTab === "subject" && (
                <div><label className={labelCls}>Subject Name</label><input name="subjectName" placeholder="e.g. Data Structures" required className={inputCls} /></div>
              )}

              {/* Hostel Field */}
              {activeTab === "hostel" && (
                <div><label className={labelCls}>Hostel Name</label><input name="hostelName" placeholder="e.g. Hostel C" required className={inputCls} /></div>
              )}

              <button
                type="submit"
                disabled={isPending}
                id="create-submit-btn"
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-all mt-2"
              >
                {isPending ? "Creating..." : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
