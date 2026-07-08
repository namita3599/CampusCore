import { prisma } from "@/lib/prisma";
import AnnouncementsClient from "@/components/AnnouncementsClient";

interface AnnouncementsViewProps {
  userId: number;
  userRole: string;
}

export default async function AnnouncementsView({ userId, userRole }: AnnouncementsViewProps) {
  const announcements = await prisma.announcement.findMany({
    where: {
      OR: [
        { targetRole: "ALL" },
        { targetRole: userRole },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const readRecords = await prisma.announcementRead.findMany({
    where: { userId },
    select: { announcementId: true },
  });

  const readIds = readRecords.map((r) => r.announcementId);

  const serialized = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    targetRole: a.targetRole,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <AnnouncementsClient
      announcements={serialized}
      readIds={readIds}
      userId={userId}
    />
  );
}
