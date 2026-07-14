import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createAnnouncement } from "@/app/dashboard/admin/actions";

// Inline helper for deleting an announcement inside a server context
async function handleDelete(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  if (!id) return;
  
  await prisma.announcement.delete({
    where: { id },
  });
  
  revalidatePath("/dashboard", "layout");
}

export default async function AnnouncementsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/login");

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 animate-fadeInUp text-zinc-950 dark:text-zinc-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Broadcasting</p>
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">Manage Announcements</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Broadcast messages to all student, teacher, warden, and admin dashboards.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 shadow-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Back to Overview
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8">
        {/* Create Form */}
        <div>
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm sticky top-24">
            <CardHeader>
              <CardTitle className="text-zinc-950 dark:text-zinc-50">New Broadcast</CardTitle>
              <CardDescription className="text-zinc-500">
                Publish a new announcement. It will show in targeted users notices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createAnnouncement} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    placeholder="e.g., End Semester Exam Schedule Out"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50 placeholder-zinc-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="targetRole" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Intended For
                  </label>
                  <select
                    id="targetRole"
                    name="targetRole"
                    required
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                  >
                    <option value="ALL">Everyone</option>
                    <option value="STUDENT">Students</option>
                    <option value="TEACHER">Teachers</option>
                    <option value="WARDEN">Wardens</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="content" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Message Content
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    required
                    rows={6}
                    placeholder="Provide description, dates, links, or important information..."
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50 placeholder-zinc-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-md font-semibold text-sm h-11 transition-all cursor-pointer"
                >
                  Publish Announcement
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Existing Announcements */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Broadcasting History ({announcements.length})
          </h2>

          {announcements.length === 0 ? (
            <Card className="border-dashed border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 p-12 text-center shadow-none">
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="p-3 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 rounded-2xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No Announcements</h3>
                  <p className="text-xs text-zinc-500 mt-1">Use the form to publish your first broadcast message.</p>
                </div>
              </div>
            </Card>
          ) : (
            announcements.map((ann) => (
              <Card key={ann.id} className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base font-bold text-zinc-950 dark:text-zinc-50">{ann.title}</CardTitle>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        ann.targetRole === "ALL"
                          ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                          : ann.targetRole === "STUDENT"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : ann.targetRole === "TEACHER"
                          ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      }`}>
                        {ann.targetRole === "ALL"
                          ? "Everyone"
                          : ann.targetRole === "STUDENT"
                          ? "Students"
                          : ann.targetRole === "TEACHER"
                          ? "Teachers"
                          : "Wardens"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-medium">
                      {new Date(ann.createdAt).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <form action={handleDelete}>
                    <input type="hidden" name="id" value={ann.id} />
                    <button
                      type="submit"
                      className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50 transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </form>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-650 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {ann.content}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
