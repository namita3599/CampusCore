import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import CreateUserModal from "./components/CreateUserModal";
import StudentsTable from "./components/StudentsTable";
import TeachersTable from "./components/TeachersTable";
import WardensTable from "./components/WardensTable";
import FeeStatusTable from "./components/FeeStatusTable";

async function getAdminData() {
  const [students, teachers, wardens, subjects, hostels] = await Promise.all([
    prisma.studentProfile.findMany({
      select: {
        id: true,
        name: true,
        branch: true,
        rollNumber: true,
        phone: true,
        guardianName: true,
        yearOfAdmission: true,
        bloodGroup: true,
        courseRegistered: true,
        tuitionPaid: true,
        hostelPaid: true,
        user: { select: { username: true, createdAt: true } },
      },
      orderBy: { id: "desc" },
    }),
    prisma.teacherProfile.findMany({
      include: {
        user: { select: { username: true } },
        subject: true,
      },
      orderBy: { id: "desc" },
    }),
    prisma.wardenProfile.findMany({
      include: {
        user: { select: { username: true } },
        hostel: true,
      },
      orderBy: { id: "desc" },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.hostel.findMany({ orderBy: { name: "asc" } }),
  ]);

  return { students, teachers, wardens, subjects, hostels };
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/login");

  const { students, teachers, wardens, subjects, hostels } = await getAdminData();

  const stats = [
    {
      label: "Total Students",
      value: students.length,
      icon: "👨‍🎓",
      color: "from-indigo-500/20 to-blue-500/20 border-indigo-500/20",
      text: "text-indigo-400",
    },
    {
      label: "Total Teachers",
      value: teachers.length,
      icon: "👩‍🏫",
      color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/20",
      text: "text-emerald-400",
    },
    {
      label: "Total Wardens",
      value: wardens.length,
      icon: "🏠",
      color: "from-violet-500/20 to-purple-500/20 border-violet-500/20",
      text: "text-violet-400",
    },
    {
      label: "Subjects",
      value: subjects.length,
      icon: "📚",
      color: "from-amber-500/20 to-orange-500/20 border-amber-500/20",
      text: "text-amber-400",
    },
  ];

  return (
    <div className="p-8 space-y-8 animate-fadeInUp text-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">CampusCore</p>
          <h1 className="text-2xl font-bold text-zinc-950">Admin Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage users, subjects, and hostels</p>
        </div>
        <CreateUserModal subjects={subjects} hostels={hostels} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-3xl font-bold text-zinc-950">{s.value}</span>
            </div>
            <p className="text-zinc-500 text-sm font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Students Table */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-zinc-950">Students</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">{students.length}</span>
        </div>
        <StudentsTable students={students} />
      </section>

      {/* Teachers Table */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-zinc-950">Teachers</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">{teachers.length}</span>
        </div>
        <TeachersTable teachers={teachers} />
      </section>

      {/* Wardens Table */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-zinc-950">Wardens</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">{wardens.length}</span>
        </div>
        <WardensTable wardens={wardens} />
      </section>

      {/* Fee Status */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-zinc-950">Fee Status — All Students</h2>
        </div>
        <FeeStatusTable students={students} />
      </section>
    </div>
  );
}
