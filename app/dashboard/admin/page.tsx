import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import TuitionDonutChart from "./components/TuitionDonutChart";
import BranchBarChart from "./components/BranchBarChart";
import DownloadReportButton from "./components/DownloadReportButton";

// ─── Data Fetching ─────────────────────────────────────────────────────────────
async function getAdminData() {
  const [
    studentCount,
    teacherCount,
    wardenCount,
    tuitionPaidCount,
    studentsWithHostelCount,
    defaulterCount,
    orphanSubjectCount,
    orphanHostelCount,
    branchGroups,
  ] = await Promise.all([
    prisma.studentProfile.count(),
    prisma.teacherProfile.count(),
    prisma.wardenProfile.count(),
    prisma.studentProfile.count({ where: { tuitionPaid: true } }),
    prisma.studentHostel.groupBy({ by: ["studentId"] }).then((r) => r.length),
    prisma.studentProfile.count({
      where: { OR: [{ tuitionPaid: false }, { hostelPaid: false }] },
    }),
    prisma.subject.count({ where: { teacherId: null } }),
    prisma.hostel.count({ where: { wardenId: null } }),
    prisma.studentProfile.groupBy({
      by: ["branch"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  return {
    studentCount,
    teacherCount,
    wardenCount,
    tuitionPaidCount,
    studentsWithHostelCount,
    defaulterCount,
    orphanCount: orphanSubjectCount + orphanHostelCount,
    branchData: branchGroups.map((g) => ({
      branch: g.branch,
      count: g._count.id,
    })),
  };
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  title,
  value,
  description,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-zinc-500">{title}</CardTitle>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-zinc-950">{value}</div>
        <p className="text-xs text-zinc-500 mt-1">{description}</p>
        {trend && <p className="text-xs text-emerald-600 mt-1 font-medium">{trend}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/login");

  const {
    studentCount,
    teacherCount,
    wardenCount,
    tuitionPaidCount,
    studentsWithHostelCount,
    defaulterCount,
    orphanCount,
    branchData,
  } = await getAdminData();

  const tuitionRate =
    studentCount > 0 ? Math.round((tuitionPaidCount / studentCount) * 100) : 0;
  const hostelRate =
    studentCount > 0
      ? Math.round((studentsWithHostelCount / studentCount) * 100)
      : 0;

  return (
    <div className="p-8 space-y-8 animate-fadeInUp text-zinc-950">
      {/* ── Header ── */}
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">CampusCore</p>
        <h1 className="text-2xl font-bold text-zinc-950">Admin Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Campus overview — live metrics, financials &amp; actionable reports.
        </p>
      </div>

      {/* ── Section 1: KPI Cards ── */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Active Students"
            value={studentCount}
            description="Total enrolled students"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14c-4.418 0-8 1.79-8 4v1h16v-1c0-2.21-3.582-4-8-4zM12 12a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            }
          />
          <KpiCard
            title="Faculty & Staff"
            value={teacherCount + wardenCount}
            description={`${teacherCount} teachers · ${wardenCount} wardens`}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
            }
          />
          <KpiCard
            title="Tuition Collection Rate"
            value={`${tuitionRate}%`}
            description={`${tuitionPaidCount} of ${studentCount} students paid`}
            trend={tuitionRate >= 80 ? "↑ On track" : "⚠ Below target"}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <KpiCard
            title="Hostel Occupancy Rate"
            value={`${hostelRate}%`}
            description={`${studentsWithHostelCount} of ${studentCount} students assigned`}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            }
          />
        </div>
      </section>

      {/* ── Section 2: Charts ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart — Tuition Financial Health */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Health</CardTitle>
            <CardDescription>
              Tuition fee collection — paid vs. unpaid students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TuitionDonutChart
              paid={tuitionPaidCount}
              unpaid={studentCount - tuitionPaidCount}
            />
          </CardContent>
        </Card>

        {/* Bar Chart — Branch Demographics */}
        <Card>
          <CardHeader>
            <CardTitle>Branch Demographics</CardTitle>
            <CardDescription>
              Total students enrolled per academic branch
            </CardDescription>
          </CardHeader>
          <CardContent>
            {branchData.length === 0 ? (
              <div className="flex items-center justify-center h-[240px] text-zinc-400 text-sm">
                No student data yet.
              </div>
            ) : (
              <BranchBarChart data={branchData} />
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Section 3: Actionable Reports ── */}
      <section>
        <h2 className="text-base font-semibold text-zinc-950 mb-4">Actionable Reports</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fee Defaulters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600 shrink-0">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
                Pending Fee Defaulters
              </CardTitle>
              <CardDescription>
                Students with outstanding tuition or hostel fee payments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600">
                There are{" "}
                <span className="font-semibold text-rose-600">{defaulterCount} student{defaulterCount !== 1 ? "s" : ""}</span>{" "}
                with pending dues (tuition or hostel fee unpaid).
              </p>
              <DownloadReportButton report="defaulters" label="Download Defaulters Report" />
            </CardContent>
          </Card>

          {/* System Orphans */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 shrink-0">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                System Orphans
              </CardTitle>
              <CardDescription>
                Subjects without assigned teachers or hostels without assigned wardens.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600">
                There are{" "}
                <span className="font-semibold text-amber-600">{orphanCount} unassigned entr{orphanCount !== 1 ? "ies" : "y"}</span>{" "}
                in the system (subjects or hostels with no assignment).
              </p>
              <DownloadReportButton report="orphans" label="Download Orphan Report" />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
