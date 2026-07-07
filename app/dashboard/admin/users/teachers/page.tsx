import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ArrowLeft, BookOpen } from "lucide-react";
import TeachersPageClient from "../../components/TeachersPageClient";

export default async function AllTeachersPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const [teachers, subjects] = await Promise.all([
    prisma.teacherProfile.findMany({
      include: {
        user: { select: { username: true, email: true } },
        subjects: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50/50 p-6 md:p-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/admin/users"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 font-medium transition-colors mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Manage Users
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-950">All Teachers</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              View, search, filter, edit and delete teacher records
            </p>
          </div>
          <div className="ml-auto">
            <span className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-100">
              {teachers.length} total
            </span>
          </div>
        </div>
      </div>

      {/* Client content */}
      <TeachersPageClient teachers={teachers as any} subjects={subjects} />
    </div>
  );
}
