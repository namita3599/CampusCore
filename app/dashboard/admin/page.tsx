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
      include: { user: { select: { username: true, createdAt: true } } },
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
    <div className="p-8 space-y-8 animate-fadeInUp">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Manage users, subjects, and hostels</p>
        </div>
        <CreateUserModal subjects={subjects} hostels={hostels} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`glass rounded-2xl p-5 bg-gradient-to-br ${s.color} border`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              <span className={`text-3xl font-bold ${s.text}`}>{s.value}</span>
            </div>
            <p className="text-slate-400 text-sm font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Students Table */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">Students</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">{students.length}</span>
        </div>
        <StudentsTable students={students} />
      </section>

      {/* Teachers Table */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">Teachers</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">{teachers.length}</span>
        </div>
        <TeachersTable teachers={teachers} />
      </section>

      {/* Wardens Table */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">Wardens</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">{wardens.length}</span>
        </div>
        <WardensTable wardens={wardens} />
      </section>

      {/* Fee Status */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">Fee Status — All Students</h2>
        </div>
        <FeeStatusTable students={students} />
      </section>
    </div>
  );
}
