"use client";

import { useState, useTransition, useRef } from "react";
import { createStudent, createTeacher, createWarden, createSubject, createHostel } from "../actions";
import { generateStudentUsername, validatePasswordStrength, generateSecurePassword } from "@/app/dashboard/admin/lib/user-management";

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

// ─── Reusable Password Field ──────────────────────────────────────────────────
function PasswordField({
  name,
  value,
  onChange,
  label,
  hint,
  error,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  label: string;
  hint?: string;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    onChange(generateSecurePassword());
    setShow(true); // reveal so the admin can see/record it
  };

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputCls =
    "w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all pr-10";
  const labelCls = "block text-sm font-medium text-zinc-700 mb-1.5";

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex gap-2">
        {/* Input with show/hide toggle */}
        <div className="relative flex-1">
          <input
            name={name}
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter or generate a password"
            required
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
            title={show ? "Hide password" : "Show password"}
          >
            {show ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* Generate button */}
        <button
          type="button"
          onClick={handleGenerate}
          title="Auto-generate a secure password"
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 transition-all whitespace-nowrap"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Generate
        </button>

        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          disabled={!value}
          title="Copy password to clipboard"
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-600">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function CreateUserModal({ subjects, hostels }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("student");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Student state ──
  const [studentName, setStudentName] = useState("");
  const [studentBranch, setStudentBranch] = useState("");
  const [studentRollNumber, setStudentRollNumber] = useState("");
  const [studentYearOfAdmission, setStudentYearOfAdmission] = useState("");
  const [studentBloodGroup, setStudentBloodGroup] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  // ── Teacher state ──
  const [teacherPassword, setTeacherPassword] = useState("");

  // ── Warden state ──
  const [wardenPassword, setWardenPassword] = useState("");

  const formRef = useRef<HTMLFormElement>(null);

  const resetAll = () => {
    setStudentName(""); setStudentBranch(""); setStudentRollNumber("");
    setStudentYearOfAdmission(""); setStudentBloodGroup(""); setStudentEmail("");
    setTeacherPassword("");
    setWardenPassword("");
    formRef.current?.reset();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    // Inject controlled password state into FormData for teacher/warden
    if (activeTab === "teacher") formData.set("password", teacherPassword);
    if (activeTab === "warden") formData.set("password", wardenPassword);

    startTransition(async () => {
      try {
        if (activeTab === "student") await createStudent(formData);
        else if (activeTab === "teacher") await createTeacher(formData);
        else if (activeTab === "warden") await createWarden(formData);
        else if (activeTab === "subject") await createSubject(formData);
        else if (activeTab === "hostel") await createHostel(formData);

        setMessage({ type: "success", text: "Created successfully!" });
        resetAll();
        setTimeout(() => {
          setIsOpen(false);
          setMessage(null);
        }, 1200);
      } catch (err: any) {
        setMessage({ type: "error", text: err.message ?? "Something went wrong." });
      }
    });
  };

  const inputCls = "w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all";
  const labelCls = "block text-sm font-medium text-zinc-700 mb-1.5";
  const generatedUsername = activeTab === "student" && studentBranch && studentRollNumber
    ? generateStudentUsername(studentBranch, studentRollNumber)
    : "";

  return (
    <>
      <button
        id="open-create-modal-btn"
        onClick={() => {
          resetAll();
          setMessage(null);
          setIsOpen(true);
        }}
        className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
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
            className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
            onClick={() => {
              resetAll();
              setMessage(null);
              setIsOpen(false);
            }}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl animate-fadeInUp overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-zinc-950">Create New Entry</h3>
              <button
                onClick={() => {
                  resetAll();
                  setMessage(null);
                  setIsOpen(false);
                }}
                className="text-zinc-500 hover:text-zinc-950 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 p-1 bg-zinc-100/80 rounded-xl">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    resetAll();
                    setMessage(null);
                    setActiveTab(tab.key);
                  }}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-all ${activeTab === tab.key
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900"
                    }`}
                >
                  {tab.emoji} {tab.label}
                </button>
              ))}
            </div>

            {/* Message */}
            {message && (
              <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm border ${message.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
                }`}>
                {message.text}
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              {/* ── Student Fields ── */}
              {activeTab === "student" && (
                <>
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input name="name" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="e.g. Rahul Gupta" required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Branch</label>
                    <select name="branch" value={studentBranch} onChange={(e) => setStudentBranch(e.target.value)} required className={inputCls}>
                      <option value="">Select branch</option>
                      {["Computer Science", "Mechanical", "Civil", "Electronics", "Chemical", "Information Technology"].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Roll Number</label>
                    <input name="rollNumber" value={studentRollNumber} onChange={(e) => setStudentRollNumber(e.target.value)} placeholder="e.g. CSE-2026-014" required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input name="phone" type="tel" placeholder="e.g. 9876543210" required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Guardian Name</label>
                    <input name="guardianName" placeholder="e.g. Rajesh Kumar" required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Year of Admission</label>
                    <input
                      name="yearOfAdmission"
                      type="number"
                      min="2000"
                      max="2100"
                      value={studentYearOfAdmission}
                      onChange={(e) => setStudentYearOfAdmission(e.target.value)}
                      placeholder="e.g. 2026"
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Blood Group (optional)</label>
                    <input
                      name="bloodGroup"
                      value={studentBloodGroup}
                      onChange={(e) => setStudentBloodGroup(e.target.value)}
                      placeholder="e.g. O+"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Student Email</label>
                    <input
                      name="email"
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="e.g. rahul@example.com"
                      required
                      className={inputCls}
                    />
                  </div>
                  <div className="flex items-start gap-2 text-sm text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
                    <svg className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    A temporary password will be generated and emailed to the student.
                  </div>
                  {generatedUsername ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                      Generated username: <span className="font-mono text-zinc-950">{generatedUsername}</span>
                    </div>
                  ) : null}
                </>
              )}

              {/* ── Teacher Fields ── */}
              {activeTab === "teacher" && (
                <>
                  <div><label className={labelCls}>Full Name</label><input name="name" placeholder="e.g. Dr. Sharma" required className={inputCls} /></div>
                  <div><label className={labelCls}>Username</label><input name="username" placeholder="e.g. teacher_sharma" required className={inputCls} /></div>
                  <PasswordField
                    name="password"
                    value={teacherPassword}
                    onChange={setTeacherPassword}
                    label="Password"
                    hint="Minimum 8 characters."
                  />
                  <div><label className={labelCls}>Assign Subject (optional)</label>
                    <select name="subjectId" className={inputCls}>
                      <option value="">— None —</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* ── Warden Fields ── */}
              {activeTab === "warden" && (
                <>
                  <div><label className={labelCls}>Full Name</label><input name="name" placeholder="e.g. Mrs. Kapoor" required className={inputCls} /></div>
                  <div><label className={labelCls}>Username</label><input name="username" placeholder="e.g. warden_kapoor" required className={inputCls} /></div>
                  <PasswordField
                    name="password"
                    value={wardenPassword}
                    onChange={setWardenPassword}
                    label="Password"
                    hint="Minimum 8 characters."
                  />
                  <div><label className={labelCls}>Assign Hostel (optional)</label>
                    <select name="hostelId" className={inputCls}>
                      <option value="">— None —</option>
                      {hostels.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* ── Subject Field ── */}
              {activeTab === "subject" && (
                <div><label className={labelCls}>Subject Name</label><input name="subjectName" placeholder="e.g. Data Structures" required className={inputCls} /></div>
              )}

              {/* ── Hostel Field ── */}
              {activeTab === "hostel" && (
                <div><label className={labelCls}>Hostel Name</label><input name="hostelName" placeholder="e.g. Hostel C" required className={inputCls} /></div>
              )}

              <button
                type="submit"
                disabled={isPending}
                id="create-submit-btn"
                className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 mt-2"
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
