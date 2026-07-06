import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

// ─── Actions inside Page (Server Action) ──────────────────────────────────────
async function handleCreateHostel(formData: FormData) {
  "use server";
  const name = formData.get("name") as string;
  if (!name || name.trim() === "") return;

  try {
    await prisma.hostel.create({
      data: { name: name.trim() },
    });
  } catch (err) {
    console.error("Failed to create hostel:", err);
  }

  revalidatePath("/dashboard/admin/hostels");
  revalidatePath("/dashboard/admin");
}

async function handleAssignWarden(formData: FormData) {
  "use server";
  const hostelId = Number(formData.get("hostelId"));
  const wardenIdStr = formData.get("wardenId") as string;

  if (isNaN(hostelId)) return;

  const wardenId = wardenIdStr === "" ? null : Number(wardenIdStr);

  try {
    await prisma.hostel.update({
      where: { id: hostelId },
      data: { wardenId },
    });
  } catch (err) {
    console.error("Failed to assign warden:", err);
  }

  revalidatePath("/dashboard/admin/hostels");
  revalidatePath("/dashboard/admin");
}

export default async function AdminHostelsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/login");

  const [hostels, wardens] = await Promise.all([
    prisma.hostel.findMany({
      include: { warden: true },
      orderBy: { name: "asc" },
    }),
    prisma.wardenProfile.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="p-8 space-y-8 animate-fadeInUp text-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Admin</p>
          <h1 className="text-2xl font-bold text-zinc-950">Hostels Management</h1>
          <p className="text-zinc-500 text-sm mt-1">Create hostels and assign them to wardens.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Hostel Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm h-fit space-y-5">
          <div className="flex items-center gap-2 pb-4 border-b border-zinc-100">
            <span className="text-xl">🏛️</span>
            <h3 className="text-base font-semibold text-zinc-950">Create New Hostel</h3>
          </div>

          <form action={handleCreateHostel} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Hostel Name</label>
              <input
                name="name"
                type="text"
                placeholder="e.g. Tagore Hostel (Block A)"
                required
                className="w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all"
                suppressHydrationWarning
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              suppressHydrationWarning
            >
              Create Hostel
            </button>
          </form>
        </div>

        {/* Hostels List & Assignments */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-150">
            <h3 className="text-base font-semibold text-zinc-950">Existing Hostels</h3>
            <p className="text-zinc-500 text-xs mt-0.5">Total of {hostels.length} hostels registered</p>
          </div>

          {hostels.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">No hostels created yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 font-semibold border-b border-zinc-150">
                    <th className="px-6 py-3.5">Hostel</th>
                    <th className="px-6 py-3.5">Assigned Warden</th>
                    <th className="px-6 py-3.5 text-right">Assign/Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {hostels.map((hostel) => (
                    <tr key={hostel.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-zinc-950">{hostel.name}</td>
                      <td className="px-6 py-4">
                        {hostel.warden ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                            🏠 {hostel.warden.name}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-xs italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form action={handleAssignWarden} className="inline-flex items-center gap-2">
                          <input type="hidden" name="hostelId" value={hostel.id} />
                          <select
                            name="wardenId"
                            className="bg-white border border-zinc-200 text-zinc-900 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            defaultValue={hostel.wardenId ?? ""}
                            suppressHydrationWarning
                          >
                            <option value="">— Unassign —</option>
                            {wardens.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-lg bg-zinc-100 border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-200 transition-colors"
                            suppressHydrationWarning
                          >
                            Apply
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
