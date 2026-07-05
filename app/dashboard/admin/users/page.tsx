import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import StudentsTable from "../components/StudentsTable";
import TeachersTable from "../components/TeachersTable";
import WardensTable from "../components/WardensTable";

async function getAdminData() {
  const [students, teachers, wardens] = await Promise.all([
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
      include: { user: { select: { username: true } }, subject: true },
      orderBy: { id: "desc" },
    }),
    prisma.wardenProfile.findMany({
      include: { user: { select: { username: true } }, hostel: true },
      orderBy: { id: "desc" },
    }),
  ]);

  return { students, teachers, wardens };
}

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "ADMIN") redirect("/login");

  const { students, teachers, wardens } = await getAdminData();

  return (
    <div className="p-8 space-y-8 animate-fadeInUp text-zinc-950">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Admin</p>
          <h1 className="text-2xl font-bold text-zinc-950">Manage Users</h1>
          <p className="text-zinc-500 text-sm mt-1">Review campus users and return to the admin dashboard anytime.</p>
        </div>

        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Admin Dashboard
        </Link>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-zinc-950">Students</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">{students.length}</span>
        </div>
        <StudentsTable students={students} />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-zinc-950">Teachers</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">{teachers.length}</span>
        </div>
        <TeachersTable teachers={teachers} />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-zinc-950">Wardens</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">{wardens.length}</span>
        </div>
        <WardensTable wardens={wardens} />
      </section>
    </div>
  );
}
