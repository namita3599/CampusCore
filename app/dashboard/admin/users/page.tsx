import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ExportButton from "../components/ExportButton";
import CreateUserForms from "../components/CreateUserForms";
import BulkUploadCard from "../components/BulkUploadCard";
import { ArrowRight } from "lucide-react";

async function getPageData() {
  const [studentCount, teacherCount, wardenCount, subjects, hostels] =
    await Promise.all([
      prisma.studentProfile.count(),
      prisma.teacherProfile.count(),
      prisma.wardenProfile.count(),
      prisma.subject.findMany({ orderBy: { name: "asc" } }),
      prisma.hostel.findMany({ orderBy: { name: "asc" } }),
    ]);
  return { studentCount, teacherCount, wardenCount, subjects, hostels };
}

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/login");

  const { studentCount, teacherCount, wardenCount, subjects, hostels } =
    await getPageData();

  const cards = [
    {
      type: "students" as const,
      label: "Students",
      count: studentCount,
      href: "/dashboard/admin/users/students",
      icon: (
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 14c-4.418 0-8 1.79-8 4v1h16v-1c0-2.21-3.582-4-8-4zM12 12a4 4 0 100-8 4 4 0 000 8z" />
        </svg>
      ),
      description: "Full student list with roll numbers, branches, fee status & more.",
      iconCls: "text-blue-600 bg-blue-100",
      countCls: "text-blue-700",
      linkCls: "text-blue-600 hover:text-blue-700",
    },
    {
      type: "teachers" as const,
      label: "Teachers",
      count: teacherCount,
      href: "/dashboard/admin/users/teachers",
      icon: (
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      description: "Teacher list with assigned subjects and usernames.",
      iconCls: "text-violet-600 bg-violet-100",
      countCls: "text-violet-700",
      linkCls: "text-violet-600 hover:text-violet-700",
    },
    {
      type: "wardens" as const,
      label: "Wardens",
      count: wardenCount,
      href: "/dashboard/admin/users/wardens",
      icon: (
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      description: "Warden list with their assigned hostels and usernames.",
      iconCls: "text-amber-600 bg-amber-100",
      countCls: "text-amber-700",
      linkCls: "text-amber-600 hover:text-amber-700",
    },
  ] as const;

  return (
    <div className="p-4 sm:p-8 space-y-8 sm:space-y-10 animate-fadeInUp text-zinc-950">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Admin</p>
          <h1 className="text-2xl font-bold text-zinc-950">Manage Users</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Create, export and manage all campus users.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 self-start sm:self-auto"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Admin Dashboard
        </Link>
      </div>

      {/* Export All Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-zinc-900">Export All Users</p>
            <p className="text-sm text-zinc-500 mt-0.5">
              Downloads a single Excel workbook with three sheets — Students, Teachers &amp; Wardens.
            </p>
          </div>
        </div>
        <ExportButton type="all" label="All Users" size="md" />
      </div>

      {/* Per-role Cards — count + View All + Export */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {cards.map(({ type, label, count, href, icon, description, iconCls, countCls, linkCls }) => (
          <div key={type} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconCls}`}>
                {icon}
              </div>
              <span className={`text-3xl font-bold ${countCls}`}>{count}</span>
            </div>
            <div>
              <p className="font-semibold text-zinc-900">{label}</p>
              <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
            </div>
            <div className="mt-auto flex items-center gap-3">
              <ExportButton type={type} label={label} size="sm" />
              <Link
                href={href}
                className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${linkCls}`}
              >
                View all
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Create User Forms */}
      <CreateUserForms subjects={subjects} hostels={hostels} />

      {/* Bulk Upload Component */}
      <BulkUploadCard />
    </div>
  );
}
