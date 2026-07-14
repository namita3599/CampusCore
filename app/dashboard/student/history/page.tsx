import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import RefreshButton from "@/components/RefreshButton";

export default async function StudentHistoryPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "STUDENT") redirect("/login");

  const userId = parseInt(session.user.id);

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      studentSubjects: {
        include: { subject: true },
        orderBy: { enrolledAt: "desc" },
      },
      feeRecords: {
        orderBy: [{ createdAt: "desc" }],
      },
    },
  });

  if (!profile) redirect("/dashboard/student");

  const fmt = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  return (
    <div className="p-4 sm:p-8 space-y-8 sm:space-y-10 animate-fadeInUp text-zinc-950 dark:text-zinc-50 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 font-semibold">Records</p>
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">My History</h1>
          <p className="text-zinc-500 text-sm mt-1">View your enrolled courses and complete fee payment history.</p>
        </div>
        <RefreshButton />
      </div>

      {/* Courses Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
          Enrolled Courses ({profile.studentSubjects.length})
        </h2>
        {profile.studentSubjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-10 text-center">
            <p className="text-zinc-400 text-sm">No courses enrolled yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-5 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">#</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Subject</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Enrolled At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {profile.studentSubjects.map((ss, i) => (
                    <tr key={ss.subjectId} className="bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                      <td className="px-5 py-3 text-zinc-400 text-xs font-mono">{i + 1}</td>
                      <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{ss.subject.name}</td>
                      <td className="px-5 py-3 text-zinc-500 text-xs">{fmt(ss.enrolledAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Fee History Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          Fee Payment History ({profile.feeRecords.length})
        </h2>
        {profile.feeRecords.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-10 text-center">
            <p className="text-zinc-400 text-sm">No fee records found. Records appear once the admin sets up fee terms.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                    {["Type", "Term", "Amount", "Status", "Paid At"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {profile.feeRecords.map((fr) => (
                    <tr key={fr.id} className="bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          fr.type === "TUITION"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                            : "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300"
                        }`}>
                          {fr.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-zinc-700 dark:text-zinc-300 max-w-[180px] truncate">{fr.term}</td>
                      <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-zinc-100">₹{fr.amount.toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          fr.status === "PAID"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${fr.status === "PAID" ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {fr.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-zinc-500 text-xs whitespace-nowrap">{fmt(fr.paidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
