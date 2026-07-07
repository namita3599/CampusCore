"use client";

import { useEffect, useState } from "react";
import { X, Megaphone } from "lucide-react";

interface Announcement {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

export default function AnnouncementNotifier({
  latestAnnouncement,
}: {
  latestAnnouncement: Announcement | null;
}) {
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (!latestAnnouncement) return;

    try {
      const notifiedId = localStorage.getItem("lastNotifiedAnnouncementId");
      if (!notifiedId || Number(notifiedId) < latestAnnouncement.id) {
        setShowNotification(true);
      }
    } catch (_) {}
  }, [latestAnnouncement]);

  const handleDismiss = () => {
    if (latestAnnouncement) {
      try {
        localStorage.setItem("lastNotifiedAnnouncementId", String(latestAnnouncement.id));
      } catch (_) {}
    }
    setShowNotification(false);
  };

  if (!showNotification || !latestAnnouncement) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-5 animate-fadeInUp flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
              New Announcement
            </span>
            <h4 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 line-clamp-1">
              {latestAnnouncement.title}
            </h4>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
        {latestAnnouncement.content}
      </p>
      <div className="flex justify-end mt-1">
        <button
          onClick={handleDismiss}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer select-none"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
