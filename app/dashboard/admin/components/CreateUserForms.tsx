"use client";

import { useState, useTransition, useRef } from "react";
import {
  createStudent,
  createTeacher,
  createWarden,
} from "../actions";
import {
  generateStudentUsername,
} from "@/app/dashboard/admin/lib/user-management";


type Subject = { id: number; name: string };
type Hostel = { id: number; name: string };

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputCls =
  "w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all";
const labelCls = "block text-sm font-medium text-zinc-700 mb-1.5";

// ─── Message Banner ───────────────────────────────────────────────────────────
function MessageBanner({ msg }: { msg: { type: "success" | "error"; text: string } }) {
  return (
    <div className={`px-4 py-2.5 rounded-xl text-sm border ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
      {msg.text}
    </div>
  );
}

// ─── Expandable Create Card ───────────────────────────────────────────────────
function CreateCard({
  title,
  description,
  emoji,
  iconCls,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  emoji: string;
  iconCls: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all duration-200 ${isOpen ? "border-zinc-300" : "border-zinc-200"}`}>
      {/* Card Header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-6 text-left hover:bg-zinc-50/60 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${iconCls}`}>
            {emoji}
          </div>
          <div>
            <p className="font-semibold text-zinc-950">{title}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
          </div>
        </div>
        {/* Chevron */}
        <svg
          className={`h-5 w-5 text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable Form Body */}
      {isOpen && (
        <div className="px-6 pb-6 border-t border-zinc-100 pt-5 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Student Form Body ────────────────────────────────────────────────────────
function StudentFormBody({ onSuccess }: { onSuccess: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [yearOfAdmission, setYearOfAdmission] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [email, setEmail] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const generatedUsername = branch && rollNumber ? generateStudentUsername(branch, rollNumber) : "";

  const reset = () => {
    setName(""); setBranch(""); setRollNumber(""); setYearOfAdmission(""); setBloodGroup(""); setEmail("");
    formRef.current?.reset();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createStudent(fd);
        setMsg({ type: "success", text: "Student created successfully! Credentials emailed." });
        reset();
        setTimeout(() => { setMsg(null); onSuccess(); }, 2000);
      } catch (err: any) {
        setMsg({ type: "error", text: err.message ?? "Something went wrong." });
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {msg && <MessageBanner msg={msg} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Full Name</label>
          <input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Gupta" required className={inputCls} suppressHydrationWarning />
        </div>
        <div>
          <label className={labelCls}>Branch</label>
          <select name="branch" value={branch} onChange={(e) => setBranch(e.target.value)} required className={inputCls} suppressHydrationWarning>
            <option value="">Select branch</option>
            {["Computer Science", "Mechanical", "Civil", "Electronics", "Chemical", "Information Technology"].map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Roll Number</label>
          <input name="rollNumber" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="e.g. CSE-2026-014" required className={inputCls} suppressHydrationWarning />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input name="phone" type="tel" placeholder="e.g. 9876543210" required className={inputCls} suppressHydrationWarning />
        </div>
        <div>
          <label className={labelCls}>Guardian Name</label>
          <input name="guardianName" placeholder="e.g. Rajesh Kumar" required className={inputCls} suppressHydrationWarning />
        </div>
        <div>
          <label className={labelCls}>Year of Admission</label>
          <input name="yearOfAdmission" type="number" min="2000" max="2100" value={yearOfAdmission} onChange={(e) => setYearOfAdmission(e.target.value)} placeholder="e.g. 2026" required className={inputCls} suppressHydrationWarning />
        </div>
        <div>
          <label className={labelCls}>Blood Group (optional)</label>
          <input name="bloodGroup" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} placeholder="e.g. O+" className={inputCls} suppressHydrationWarning />
        </div>
        <div>
          <label className={labelCls}>Student Email</label>
          <input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. rahul@example.com" required className={inputCls} suppressHydrationWarning />
        </div>
      </div>
      {generatedUsername && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          Generated username: <span className="font-mono text-zinc-950">{generatedUsername}</span>
        </div>
      )}
      <div className="flex items-start gap-2 text-sm text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        A temporary password will be generated and emailed to the student.
      </div>
      <button type="submit" disabled={isPending} className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60" suppressHydrationWarning>
        {isPending ? "Creating…" : "Create Student"}
      </button>
    </form>
  );
}

// ─── Teacher Form Body ────────────────────────────────────────────────────────
function TeacherFormBody({ subjects, onSuccess }: { subjects: Subject[]; onSuccess: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createTeacher(fd);
        setMsg({ type: "success", text: "Teacher created successfully! Credentials emailed." });
        formRef.current?.reset();
        setTimeout(() => { setMsg(null); onSuccess(); }, 2000);
      } catch (err: any) {
        setMsg({ type: "error", text: err.message ?? "Something went wrong." });
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {msg && <MessageBanner msg={msg} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Full Name</label>
          <input name="name" placeholder="e.g. Dr. Sharma" required className={inputCls} suppressHydrationWarning />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input name="phone" type="tel" placeholder="e.g. 9876543210" required className={inputCls} suppressHydrationWarning />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Email</label>
          <input name="email" type="email" placeholder="e.g. sharma@example.com" required className={inputCls} suppressHydrationWarning />
        </div>
      </div>
      <div>
        <label className={labelCls}>Assign Subject (optional)</label>
        <select name="subjectId" className={inputCls} suppressHydrationWarning>
          <option value="">— None —</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="flex items-start gap-2 text-sm text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        A temporary password will be generated and emailed to the teacher.
      </div>
      <button type="submit" disabled={isPending} className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60" suppressHydrationWarning>
        {isPending ? "Creating…" : "Create Teacher"}
      </button>
    </form>
  );
}

// ─── Warden Form Body ─────────────────────────────────────────────────────────
function WardenFormBody({ hostels, onSuccess }: { hostels: Hostel[]; onSuccess: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createWarden(fd);
        setMsg({ type: "success", text: "Warden created successfully! Credentials emailed." });
        formRef.current?.reset();
        setTimeout(() => { setMsg(null); onSuccess(); }, 2000);
      } catch (err: any) {
        setMsg({ type: "error", text: err.message ?? "Something went wrong." });
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {msg && <MessageBanner msg={msg} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Full Name</label>
          <input name="name" placeholder="e.g. Mrs. Kapoor" required className={inputCls} suppressHydrationWarning />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input name="phone" type="tel" placeholder="e.g. 9876543210" required className={inputCls} suppressHydrationWarning />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Email</label>
          <input name="email" type="email" placeholder="e.g. kapoor@example.com" required className={inputCls} suppressHydrationWarning />
        </div>
      </div>
      <div>
        <label className={labelCls}>Assign Hostel (optional)</label>
        <select name="hostelId" className={inputCls} suppressHydrationWarning>
          <option value="">— None —</option>
          {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>
      <button type="submit" disabled={isPending} className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60" suppressHydrationWarning>
        {isPending ? "Creating…" : "Create Warden"}
      </button>
    </form>
  );
}

// ─── Exported Composite Component ─────────────────────────────────────────────
export default function CreateUserForms({
  subjects,
  hostels,
}: {
  subjects: Subject[];
  hostels: Hostel[];
}) {
  const [openCard, setOpenCard] = useState<"student" | "teacher" | "warden" | null>(null);

  const toggle = (key: "student" | "teacher" | "warden") =>
    setOpenCard((prev) => (prev === key ? null : key));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-200" />
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Create Users</p>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      {/* Student */}
      <CreateCard
        title="Create Student"
        description="Register a new student and send login credentials via email."
        emoji="👨‍🎓"
        iconCls="bg-blue-100"
        isOpen={openCard === "student"}
        onToggle={() => toggle("student")}
      >
        <StudentFormBody onSuccess={() => setOpenCard(null)} />
      </CreateCard>

      {/* Teacher */}
      <CreateCard
        title="Create Teacher"
        description="Add a new teacher and optionally assign a subject."
        emoji="👩‍🏫"
        iconCls="bg-violet-100"
        isOpen={openCard === "teacher"}
        onToggle={() => toggle("teacher")}
      >
        <TeacherFormBody subjects={subjects} onSuccess={() => setOpenCard(null)} />
      </CreateCard>

      {/* Warden */}
      <CreateCard
        title="Create Warden"
        description="Add a new warden and optionally assign a hostel."
        emoji="🏠"
        iconCls="bg-amber-100"
        isOpen={openCard === "warden"}
        onToggle={() => toggle("warden")}
      >
        <WardenFormBody hostels={hostels} onSuccess={() => setOpenCard(null)} />
      </CreateCard>
    </div>
  );
}
