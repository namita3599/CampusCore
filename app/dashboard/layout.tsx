import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Sidebar from "./components/Sidebar";
import ForcePasswordChangeModal from "./components/ForcePasswordChangeModal";
import AnnouncementNotifier from "@/components/AnnouncementNotifier";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userId = Number(session.user.id);
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { forcePasswordChange: true, role: true, username: true },
  });

  const mustChangePassword = dbUser?.forcePasswordChange && dbUser?.role !== "ADMIN";

  if (mustChangePassword) {
    return (
      <div className="h-screen w-screen bg-zinc-950 overflow-hidden">
        <ForcePasswordChangeModal userId={userId} username={dbUser.username} />
      </div>
    );
  }

  const userRole = dbUser?.role;

  const rawAnnouncements = await prisma.announcement.findMany({
    where: userRole === "ADMIN" ? {} : {
      OR: [
        { targetRole: "ALL" },
        { targetRole: userRole },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const announcements = rawAnnouncements.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    createdAt: a.createdAt.toISOString(),
  }));

  const latestAnnouncement = userRole === "ADMIN" ? null : (announcements[0] ?? null);

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden text-zinc-950">
      <Sidebar announcements={announcements} />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full bg-zinc-50">
          {children}
        </div>
      </main>
      <AnnouncementNotifier latestAnnouncement={latestAnnouncement} />
    </div>
  );
}
