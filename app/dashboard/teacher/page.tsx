import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function TeacherDashboardPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "TEACHER") redirect("/login");

  const userId = parseInt(session.user.id);

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId },
    include: {
      subject: {
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
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-slate-400">Teacher profile not found. Contact the admin.</p>
        </div>
      </div>
    );
  }

  const subject = teacher.subject;
  const enrolledStudents = subject?.studentSubjects ?? [];

  return (
    <div className="p-8 space-y-8 animate-fadeInUp">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome, {teacher.name} 👋</h1>
        <p className="text-slate-400 text-sm mt-1">Teacher Dashboard</p>
      </div>

      {/* Subject Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6 border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-sm text-emerald-400 font-medium mb-2">📚 Assigned Subject</p>
          {subject ? (
            <>
              <p className="text-2xl font-bold text-white">{subject.name}</p>
              <p className="text-xs text-slate-500 mt-1">Subject ID: #{subject.id}</p>
            </>
          ) : (
            <p className="text-slate-500 italic text-sm">No subject assigned yet. Contact the admin.</p>
          )}
        </div>

        <div className="glass rounded-2xl p-6 border border-indigo-500/20 bg-indigo-500/5">
          <p className="text-sm text-indigo-400 font-medium mb-2">👨‍🎓 Enrolled Students</p>
          <p className="text-2xl font-bold text-white">{enrolledStudents.length}</p>
          <p className="text-xs text-slate-500 mt-1">Students enrolled in your subject</p>
        </div>
      </div>

      {/* Students Table */}
      {subject && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-white">Students in {subject.name}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              {enrolledStudents.length}
            </span>
          </div>

          {enrolledStudents.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-slate-500 text-sm">No students have enrolled in this subject yet.</p>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden">
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
                  {enrolledStudents.map(({ student }, i) => (
                    <tr key={student.id}>
                      <td className="text-slate-500 text-xs">{i + 1}</td>
                      <td className="font-medium text-white">{student.name}</td>
                      <td className="text-slate-400 font-mono text-xs">{student.user.username}</td>
                      <td>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                          {student.branch}
                        </span>
                      </td>
                      <td>
                        {student.tuitionPaid ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">✓ Paid</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">⏳ Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
