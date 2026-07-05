"use client";

import { useState, useTransition } from "react";
import { registerSubjects, payTuition, payHostel } from "./actions";

type Subject = { id: number; name: string };
type StudentProfile = {
  id: number;
  name: string;
  branch: string;
  rollNumber?: string | null;
  phone?: string | null;
  guardianName?: string | null;
  yearOfAdmission?: number | null;
  bloodGroup?: string | null;
  courseRegistered: boolean;
  tuitionPaid: boolean;
  hostelPaid: boolean;
  studentSubjects: { subject: Subject }[];
};

export default function StudentDashboardClient({
  profile,
  allSubjects,
}: {
  profile: StudentProfile;
  allSubjects: Subject[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>(
    profile.studentSubjects.map((ss) => ss.subject.id)
  );
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [step, setStep] = useState<"register" | "tuition" | "hostel" | "done">(
    !profile.courseRegistered
      ? "register"
      : !profile.tuitionPaid
      ? "tuition"
      : !profile.hostelPaid
      ? "hostel"
      : "done"
  );

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleRegister = () => {
    startTransition(async () => {
      try {
        await registerSubjects(profile.id, selectedSubjects);
        showMsg("success", "Subjects registered successfully!");
        setStep("tuition");
      } catch (e: any) {
        showMsg("error", e.message);
      }
    });
  };

  const handlePayTuition = () => {
    startTransition(async () => {
      await payTuition(profile.id);
      showMsg("success", "Tuition fee paid!");
      setStep("hostel");
    });
  };

  const handlePayHostel = () => {
    startTransition(async () => {
      await payHostel(profile.id);
      showMsg("success", "Hostel fee paid!");
      setStep("done");
    });
  };

  const statusItems = [
    { label: "Course Registered", value: profile.courseRegistered, icon: "📚" },
    { label: "Tuition Paid", value: profile.tuitionPaid, icon: "💳" },
    { label: "Hostel Paid", value: profile.hostelPaid, icon: "🏠" },
  ];

  return (
    <div className="p-8 space-y-8 animate-fadeInUp text-zinc-950">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Student Portal</p>
        <h1 className="text-2xl font-bold text-zinc-950">Welcome, {profile.name} 👋</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Branch: <span className="text-zinc-900 font-medium">{profile.branch}</span>
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statusItems.map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border bg-white p-5 shadow-sm ${
              item.value
                ? "border-emerald-200"
                : "border-zinc-200"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{item.icon}</span>
              {item.value ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  ✓ Complete
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  ⏳ Pending
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-zinc-700">{item.label}</p>
          </div>
        ))}
      </div>

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

      {/* Action Panel */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950 mb-5">
          {step === "register" && "Step 1 of 3 — Course Registration"}
          {step === "tuition" && "Step 2 of 3 — Pay Tuition Fees"}
          {step === "hostel" && "Step 3 of 3 — Pay Hostel Fees"}
          {step === "done" && "🎉 All Steps Complete!"}
        </h2>

        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {["register", "tuition", "hostel"].map((s, i) => (
            <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden bg-zinc-100">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{
                  width:
                    (step === "register" && i === 0) ||
                    (step === "tuition" && i <= 1) ||
                    (step === "hostel" && i <= 2) ||
                    step === "done"
                      ? (step === "register" && i === 0) ? "100%" :
                        (step === "tuition" && i === 0) ? "100%" :
                        (step === "tuition" && i === 1) ? "50%" :
                        (step === "hostel") ? "100%" :
                        step === "done" ? "100%" : "0%"
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Step 1 — Register */}
        {step === "register" && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">Select the subjects you want to enroll in:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allSubjects.map((subj) => {
                const checked = selectedSubjects.includes(subj.id);
                return (
                  <label
                    key={subj.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      checked
                        ? "bg-zinc-100 border-zinc-300 text-zinc-950"
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
                    <span className="text-sm font-medium">{subj.name}</span>
                  </label>
                );
              })}
            </div>
            {allSubjects.length === 0 && (
              <p className="text-sm text-zinc-500 italic">No subjects available yet. Contact the admin.</p>
            )}
            <button
              onClick={handleRegister}
              disabled={isPending || selectedSubjects.length === 0}
              id="register-subjects-btn"
              className="mt-2 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
            >
              {isPending ? "Registering..." : "Register Subjects →"}
            </button>
          </div>
        )}

        {/* Step 2 — Tuition */}
        {step === "tuition" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <p className="text-sm text-zinc-600 font-medium mb-1">Tuition Fee</p>
              <p className="text-3xl font-bold text-zinc-950">₹45,000</p>
              <p className="text-xs text-zinc-500 mt-1">Per semester — Academic Year 2024–25</p>
            </div>
            <button
              onClick={handlePayTuition}
              disabled={isPending}
              id="pay-tuition-btn"
              className="rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
            >
              {isPending ? "Processing..." : "💳 Pay Tuition Fee →"}
            </button>
          </div>
        )}

        {/* Step 3 — Hostel */}
        {step === "hostel" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <p className="text-sm text-zinc-600 font-medium mb-1">Hostel Fee</p>
              <p className="text-3xl font-bold text-zinc-950">₹25,000</p>
              <p className="text-xs text-zinc-500 mt-1">Per semester — includes meals & utilities</p>
            </div>
            <button
              onClick={handlePayHostel}
              disabled={isPending}
              id="pay-hostel-btn"
              className="rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
            >
              {isPending ? "Processing..." : "🏠 Pay Hostel Fee →"}
            </button>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="text-center py-8 space-y-3">
            <div className="text-5xl">🎓</div>
            <p className="text-xl font-bold text-zinc-950">All done!</p>
            <p className="text-zinc-500 text-sm">
              You have successfully registered for courses and paid all fees. Good luck with your semester!
            </p>
          </div>
        )}
      </div>

      {/* Enrolled Subjects */}
      {profile.studentSubjects.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-950 mb-4">My Enrolled Subjects</h3>
          <div className="flex flex-wrap gap-2">
            {profile.studentSubjects.map(({ subject }) => (
              <span
                key={subject.id}
                className="px-3 py-1 rounded-full text-sm bg-zinc-100 text-zinc-700 border border-zinc-200"
              >
                {subject.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
