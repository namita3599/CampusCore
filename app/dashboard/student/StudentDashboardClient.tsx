"use client";

import Link from "next/link";

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
}: {
  profile: StudentProfile;
  allSubjects: Subject[];
}) {
  const statusItems = [
    {
      label: "Course Registration",
      value: profile.courseRegistered,
      icon: "📚",
      link: "/dashboard/student/register",
      actionText: "Manage Courses →",
    },
    {
      label: "Tuition Fee Paid",
      value: profile.tuitionPaid,
      icon: "💳",
      link: "/dashboard/student/fees",
      actionText: "Pay Fees →",
    },
    {
      label: "Hostel Fee Paid",
      value: profile.hostelPaid,
      icon: "🏠",
      link: "/dashboard/student/fees",
      actionText: "Pay Fees →",
    },
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
            className={`rounded-2xl border bg-white p-5 shadow-sm flex flex-col justify-between space-y-4 ${
              item.value ? "border-emerald-250 bg-emerald-50/10" : "border-zinc-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{item.icon}</span>
                {item.value ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                    ✓ Settled
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                    ⏳ Pending
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-zinc-800">{item.label}</p>
            </div>

            {!item.value && (
              <Link
                href={item.link}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
              >
                {item.actionText}
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Main Grid: Profile & Enrolled Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-zinc-950 pb-3 border-b border-zinc-100 flex items-center gap-2">
            👤 Student Profile
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-zinc-500 block text-xs">Roll Number</span>
              <span className="font-semibold text-zinc-900">{profile.rollNumber ?? "N/A"}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-xs">Phone Number</span>
              <span className="font-semibold text-zinc-900">{profile.phone ?? "N/A"}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-xs">Guardian Name</span>
              <span className="font-semibold text-zinc-900">{profile.guardianName ?? "N/A"}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-xs">Admission Year</span>
              <span className="font-semibold text-zinc-900">{profile.yearOfAdmission ?? "N/A"}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-xs">Blood Group</span>
              <span className="font-semibold text-zinc-900">{profile.bloodGroup ?? "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Subjects Card */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-950 pb-3 border-b border-zinc-100 flex items-center gap-2">
              📚 Enrolled Subjects
            </h3>
            {profile.studentSubjects.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-sm">
                You have not registered for any subjects yet.
                <div className="mt-3">
                  <Link
                    href="/dashboard/student/register"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold text-xs border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50"
                  >
                    Go to Course Registration
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {profile.studentSubjects.map(({ subject }) => (
                  <div
                    key={subject.id}
                    className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-800 flex items-center gap-2"
                  >
                    <span className="text-indigo-500">•</span>
                    {subject.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {profile.studentSubjects.length > 0 && (
            <p className="text-xs text-zinc-500 mt-6 pt-4 border-t border-zinc-100">
              Note: To update or make changes to your selected courses, navigate to the{" "}
              <Link href="/dashboard/student/register" className="text-indigo-600 font-medium hover:underline">
                Course Registration
              </Link>{" "}
              page.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
