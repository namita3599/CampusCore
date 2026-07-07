import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, Calendar } from "lucide-react";

export default async function AnnouncementsView() {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 space-y-8 animate-fadeInUp text-zinc-950 dark:text-zinc-50 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 font-semibold">Notice Board</p>
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">Announcements</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Stay updated with the latest campus notifications and official broadcasts.
          </p>
        </div>
      </div>

      {announcements.length === 0 ? (
        <Card className="border-dashed border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 p-12 text-center shadow-none rounded-2xl">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3.5 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 rounded-2xl">
              <Megaphone className="w-6 h-6 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No Announcements</h3>
              <p className="text-xs text-zinc-500 mt-1">There are no notices posted on the board yet.</p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {announcements.map((ann) => (
            <Card key={ann.id} className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 rounded-2xl">
              <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/40">
                <CardTitle className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full shrink-0" />
                  {ann.title}
                </CardTitle>
                <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 font-medium shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs">
                    {new Date(ann.createdAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 pb-5">
                <p className="text-sm text-zinc-650 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {ann.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
