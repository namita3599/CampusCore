import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function WardenDashboardPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "WARDEN") redirect("/login");

  const userId = parseInt(session.user.id);

  const warden = await prisma.wardenProfile.findUnique({
    where: { userId },
    include: {
      hostel: {
        include: {
          studentHostels: {
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

  if (!warden) {
    return (
      <div className="p-8">
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-slate-400">Warden profile not found. Contact the admin.</p>
        </div>
      </div>
    );
  }

  const hostel = warden.hostel;
  const hostelStudents = hostel?.studentHostels ?? [];

  return (
    <div className="p-8 space-y-8 animate-fadeInUp">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome, {warden.name} 👋</h1>
        <p className="text-slate-400 text-sm mt-1">Warden Dashboard</p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6 border border-violet-500/20 bg-violet-500/5">
          <p className="text-sm text-violet-400 font-medium mb-2">🏛️ Assigned Hostel</p>
          {hostel ? (
            <>
              <p className="text-2xl font-bold text-white">{hostel.name}</p>
              <p className="text-xs text-slate-500 mt-1">Hostel ID: #{hostel.id}</p>
            </>
          ) : (
            <p className="text-slate-500 italic text-sm">No hostel assigned yet. Contact the admin.</p>
          )}
        </div>

        <div className="glass rounded-2xl p-6 border border-indigo-500/20 bg-indigo-500/5">
          <p className="text-sm text-indigo-400 font-medium mb-2">👥 Residents</p>
          <p className="text-2xl font-bold text-white">{hostelStudents.length}</p>
          <p className="text-xs text-slate-500 mt-1">Students currently in your hostel</p>
        </div>
      </div>

      {/* Students Table */}
      {hostel && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-white">Residents of {hostel.name}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">
              {hostelStudents.length}
            </span>
          </div>

          {hostelStudents.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-slate-500 text-sm">No students have been assigned to this hostel yet.</p>
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
                    <th>Hostel Fee</th>
                    <th>Course Status</th>
                  </tr>
                </thead>
                <tbody>
                  {hostelStudents.map(({ student }, i) => (
                    <tr key={student.id}>
                      <td className="text-slate-500 text-xs">{i + 1}</td>
                      <td className="font-medium text-white">{student.name}</td>
                      <td className="text-slate-400 font-mono text-xs">{student.user.username}</td>
                      <td>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-violet-500/10 text-violet-400 border border-violet-500/15">
                          {student.branch}
                        </span>
                      </td>
                      <td>
                        {student.hostelPaid ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">✓ Paid</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">⏳ Pending</span>
                        )}
                      </td>
                      <td>
                        {student.courseRegistered ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">✓ Registered</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/20">Not yet</span>
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
