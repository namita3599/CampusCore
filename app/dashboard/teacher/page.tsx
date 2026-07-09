import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ChangePasswordForm from "../components/ChangePasswordForm";

export default async function TeacherDashboardPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "TEACHER") redirect("/login");

  const userId = parseInt(session.user.id);

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          username: true,
          email: true,
        },
      },
      subjects: {
        include: {
          studentSubjects: {
            include: {
              student: {
                include: { user: { select: { username: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!teacher) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-zinc-500">Teacher profile not found. Contact the admin.</p>
        </div>
      </div>
    );
  }

  const subjects = teacher.subjects ?? [];
  const subjectNames = subjects.map((s) => s.name).join(", ");
  const enrolledStudents = subjects.flatMap((s) => s.studentSubjects ?? []);

  return (
    <div className="p-8 space-y-8 animate-fadeInUp text-zinc-950">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Faculty Portal</p>
        <h1 className="text-2xl font-bold text-zinc-950">Welcome, {teacher.name} 👋</h1>
        <p className="text-zinc-500 text-sm mt-1">Teacher Dashboard</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile */}
        <div className="lg:col-span-1">
          {/* Profile Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-zinc-950 pb-3 border-b border-zinc-100 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">👤 Faculty Profile</span>
              <ChangePasswordForm userId={userId} />
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-zinc-500 block text-xs">Full Name</span>
                <span className="font-semibold text-zinc-900">{teacher.name}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-xs">Username</span>
                <span className="font-semibold text-zinc-900 font-mono">{teacher.user.username}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-xs">Email Address</span>
                <span className="font-semibold text-zinc-900">{teacher.user.email ?? "N/A"}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-xs">Phone Number</span>
                <span className="font-semibold text-zinc-900">{teacher.phone ?? "N/A"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Info stats & Students List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-zinc-600 font-medium mb-2">📚 Assigned Subject(s)</p>
              {subjects.length > 0 ? (
                <>
                  <p className="text-2xl font-bold text-zinc-950">{subjectNames}</p>
                  <p className="text-xs text-zinc-500 mt-1">Total managed: {subjects.length}</p>
                </>
              ) : (
                <p className="text-zinc-500 italic text-sm">No subject assigned yet. Contact the admin.</p>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-zinc-600 font-medium mb-2">👨‍🎓 Enrolled Students</p>
              <p className="text-2xl font-bold text-zinc-950">{enrolledStudents.length}</p>
              <p className="text-xs text-zinc-500 mt-1">Students enrolled in your subject(s)</p>
            </div>
          </div>

          {/* Students Table */}
          {subjects.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-zinc-950">Students in {subjectNames}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                  {enrolledStudents.length}
                </span>
              </div>

              {enrolledStudents.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
                  <p className="text-zinc-500 text-sm">No students have enrolled in these subjects yet.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student Name</th>
                        <th>Username</th>
                        <th>Branch</th>
                        <th>Tuition Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrolledStudents.map((item, i) => {
                        const { student } = item;
                        return (
                          <tr key={`${student.id}-${item.subjectId}`}>
                            <td className="text-zinc-500 text-xs">{i + 1}</td>
                            <td className="font-medium text-zinc-950">{student.name}</td>
                            <td className="text-zinc-500 font-mono text-xs">{student.user.username}</td>
                            <td>
                              <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-700 border border-zinc-200">
                                {student.branch}
                              </span>
                            </td>
                            <td>
                              {student.tuitionPaid ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Paid</span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">⏳ Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
