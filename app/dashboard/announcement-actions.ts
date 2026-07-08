"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

export async function markAnnouncementAsRead(announcementId: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = parseInt(session.user.id);
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new Error("User not found");
  }

  await prisma.announcementRead.upsert({
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

  const userId = parseInt(session.user.id);
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new Error("User not found");
  }

  const unreadAnnouncements = await prisma.announcement.findMany({
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
    await prisma.announcementRead.createMany({
      data: unreadAnnouncements.map((ann) => ({
        userId: user.id,
        announcementId: ann.id,
      })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/dashboard", "layout");
}
