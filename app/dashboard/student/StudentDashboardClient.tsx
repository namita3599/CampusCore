"use client";

import { useState, useTransition } from "react";
import { registerSubjects, payTuition, payHostel } from "./actions";

type Subject = { id: number; name: string };
type StudentProfile = {
  id: number;
  name: string;
  branch: string;
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
    <div className="p-8 space-y-8 animate-fadeInUp">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome, {profile.name} 👋</h1>
        <p className="text-slate-400 text-sm mt-1">
          Branch: <span className="text-indigo-400 font-medium">{profile.branch}</span>
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statusItems.map((item) => (
          <div
            key={item.label}
            className={`glass rounded-2xl p-5 border ${
              item.value
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-slate-500/5 border-slate-500/20"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{item.icon}</span>
              {item.value ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">
                  ✓ Complete
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">
                  ⏳ Pending
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-300">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          message.type === "success"
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-red-500/10 text-red-400 border-red-500/20"
        }`}>
          {message.type === "success" ? "✅" : "❌"} {message.text}
        </div>
      )}

      {/* Action Panel */}
      <div className="glass rounded-2xl p-6 border border-white/8">
        <h2 className="text-lg font-semibold text-white mb-5">
          {step === "register" && "Step 1 of 3 — Course Registration"}
          {step === "tuition" && "Step 2 of 3 — Pay Tuition Fees"}
          {step === "hostel" && "Step 3 of 3 — Pay Hostel Fees"}
          {step === "done" && "🎉 All Steps Complete!"}
        </h2>

        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {["register", "tuition", "hostel"].map((s, i) => (
            <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/10">
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
            <p className="text-sm text-slate-400">Select the subjects you want to enroll in:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allSubjects.map((subj) => {
                const checked = selectedSubjects.includes(subj.id);
                return (
                  <label
                    key={subj.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      checked
                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                        : "bg-white/3 border-white/8 text-slate-400 hover:border-white/15"
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
              <p className="text-sm text-slate-500 italic">No subjects available yet. Contact the admin.</p>
            )}
            <button
              onClick={handleRegister}
              disabled={isPending || selectedSubjects.length === 0}
              id="register-subjects-btn"
              className="mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-2.5 text-sm transition-all"
            >
              {isPending ? "Registering..." : "Register Subjects →"}
            </button>
          </div>
        )}

        {/* Step 2 — Tuition */}
        {step === "tuition" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <p className="text-sm text-amber-300 font-medium mb-1">Tuition Fee</p>
              <p className="text-3xl font-bold text-white">₹45,000</p>
              <p className="text-xs text-slate-500 mt-1">Per semester — Academic Year 2024–25</p>
            </div>
            <button
              onClick={handlePayTuition}
              disabled={isPending}
              id="pay-tuition-btn"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-2.5 text-sm transition-all"
            >
              {isPending ? "Processing..." : "💳 Pay Tuition Fee →"}
            </button>
          </div>
        )}

        {/* Step 3 — Hostel */}
        {step === "hostel" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
              <p className="text-sm text-violet-300 font-medium mb-1">Hostel Fee</p>
              <p className="text-3xl font-bold text-white">₹25,000</p>
              <p className="text-xs text-slate-500 mt-1">Per semester — includes meals & utilities</p>
            </div>
            <button
              onClick={handlePayHostel}
              disabled={isPending}
              id="pay-hostel-btn"
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-2.5 text-sm transition-all"
            >
              {isPending ? "Processing..." : "🏠 Pay Hostel Fee →"}
            </button>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="text-center py-8 space-y-3">
            <div className="text-5xl">🎓</div>
            <p className="text-xl font-bold text-white">All done!</p>
            <p className="text-slate-400 text-sm">
              You have successfully registered for courses and paid all fees. Good luck with your semester!
            </p>
          </div>
        )}
      </div>

      {/* Enrolled Subjects */}
      {profile.studentSubjects.length > 0 && (
        <div className="glass rounded-2xl p-6 border border-white/8">
          <h3 className="text-base font-semibold text-white mb-4">My Enrolled Subjects</h3>
          <div className="flex flex-wrap gap-2">
            {profile.studentSubjects.map(({ subject }) => (
              <span
                key={subject.id}
                className="px-3 py-1 rounded-full text-sm bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
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
