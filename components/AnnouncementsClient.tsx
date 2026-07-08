"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, Calendar, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  markAnnouncementAsRead,
  markAllAnnouncementsAsRead,
} from "@/app/dashboard/announcement-actions";

interface Announcement {
  id: number;
  title: string;
  content: string;
  targetRole: string;
  createdAt: string;
}

interface AnnouncementsClientProps {
  announcements: Announcement[];
  readIds: number[];
  userId: number;
}

export default function AnnouncementsClient({
  announcements,
  readIds: initialReadIds,
  userId,
}: AnnouncementsClientProps) {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(new Set(initialReadIds));
  const [isPending, startTransition] = useTransition();

  const displayed = showUnreadOnly
    ? announcements.filter((a) => !readIds.has(a.id))
    : announcements;

  const hasUnread = announcements.some((a) => !readIds.has(a.id));

  const handleMarkRead = (announcementId: number) => {
    startTransition(async () => {
      await markAnnouncementAsRead(announcementId);
      setReadIds((prev) => new Set([...prev, announcementId]));
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllAnnouncementsAsRead();
      setReadIds(new Set(announcements.map((a) => a.id)));
    });
  };

  return (
    <div className="p-8 space-y-8 animate-fadeInUp text-zinc-950 dark:text-zinc-50 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 font-semibold">Notice Board</p>
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">Announcements</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Stay updated with the latest campus notifications and official broadcasts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Unread Toggle Button */}
          <button
            onClick={() => setShowUnreadOnly((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showUnreadOnly
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                showUnreadOnly ? "bg-white" : "bg-emerald-500"
              }`}
            />
            {showUnreadOnly ? "Unread Only ✕" : "Unread Only"}
          </button>

          {/* Mark All Read */}
          {hasUnread && (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              Mark All as Read
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <Card className="border-dashed border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 p-12 text-center shadow-none rounded-2xl">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3.5 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 rounded-2xl">
              <Megaphone className="w-6 h-6 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {showUnreadOnly ? "No Unread Announcements" : "No Announcements"}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                {showUnreadOnly
                  ? "You're all caught up! Toggle off to see all announcements."
                  : "There are no notices posted on your board yet."}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {displayed.map((ann) => {
            const isRead = readIds.has(ann.id);
            return (
              <Card
                key={ann.id}
                className={`border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 rounded-2xl ${
                  !isRead ? "ring-1 ring-emerald-500/20 dark:ring-emerald-500/30" : ""
                }`}
              >
                <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/40">
                  <div className="space-y-1.5">
                    <CardTitle className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 flex-wrap">
                      {!isRead ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider bg-emerald-600 text-white animate-pulse uppercase">
                          New
                        </span>
                      ) : (
                        <span className="w-1.5 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full shrink-0" />
                      )}
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
                  </div>
                  {!isRead && (
                    <button
                      disabled={isPending}
                      onClick={() => handleMarkRead(ann.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 transition-all cursor-pointer shrink-0 mt-1 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark Read
                    </button>
                  )}
                </CardHeader>
                <CardContent className="pt-4 pb-5">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {ann.content}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
