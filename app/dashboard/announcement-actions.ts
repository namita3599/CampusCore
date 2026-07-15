"use server";

import { getTenantPrisma } from "@/lib/prisma-tenant";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

export async function markAnnouncementAsRead(announcementId: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const db = getTenantPrisma(session.user.institutionId);
  const userId = parseInt(session.user.id);
  const user = await db.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new Error("User not found");
  }

  await db.announcementRead.upsert({
    where: {
      userId_announcementId: {
        userId: user.id,
        announcementId,
      },
    },
    update: {},
    create: {
      userId: user.id,
      announcementId,
    },
  });

  revalidatePath("/dashboard", "layout");
}

export async function markAllAnnouncementsAsRead() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const db = getTenantPrisma(session.user.institutionId);
  const userId = parseInt(session.user.id);
  const user = await db.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new Error("User not found");
  }

  const unreadAnnouncements = await db.announcement.findMany({
    where: {
      OR: [
        { targetRole: "ALL" },
        { targetRole: user.role },
      ],
      announcementReads: {
        none: {
          userId: user.id,
        },
      },
    },
  });

  if (unreadAnnouncements.length > 0) {
    await db.announcementRead.createMany({
      data: unreadAnnouncements.map((ann) => ({
        userId: user.id,
        announcementId: ann.id,
      })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/dashboard", "layout");
}
