"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getAvailableRooms() {
  try {
    const now = new Date();

    // 1. Perform Lazy Cleanup of expired holds in DB directly
    await prisma.room.updateMany({
      where: {
        status: "HELD",
        holdExpiresAt: { lt: now },
      },
      data: {
        status: "AVAILABLE",
        heldByUserId: null,
        holdExpiresAt: null,
      },
    });

    // 2. Query all rooms including hostel and hold details
    const rooms = await prisma.room.findMany({
      include: {
        hostel: { select: { id: true, name: true } },
      },
      orderBy: [{ hostel: { name: "asc" } }, { roomNumber: "asc" }],
    });

    // 3. Map status on frontend read-level just in case
    return rooms.map((room) => {
      const isExpired = room.status === "HELD" && room.holdExpiresAt && room.holdExpiresAt < now;
      if (isExpired) {
        return {
          ...room,
          status: "AVAILABLE",
          heldByUserId: null,
          holdExpiresAt: null,
        };
      }
      return room;
    });
  } catch (err: any) {
    console.error("Error fetching rooms:", err);
    throw new Error("Failed to load rooms list.");
  }
}

export async function reserveRoom(roomId: string, userId: number) {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

    // 1. Concurrency Rule: Student can only have 1 booked room in total
    const existingBooking = await prisma.room.findUnique({
      where: { bookedByUserId: userId },
    });
    if (existingBooking) {
      throw new Error("You already have an active hostel room booking.");
    }

    // 2. Atomic hold operation using updateMany to prevent race conditions
    const updated = await prisma.room.updateMany({
      where: {
        id: roomId,
        OR: [
          { status: "AVAILABLE" },
          {
            status: "HELD",
            holdExpiresAt: { lt: now },
          },
        ],
      },
      data: {
        status: "HELD",
        heldByUserId: userId,
        holdExpiresAt: expiresAt,
      },
    });

    if (updated.count === 0) {
      throw new Error("Room is no longer available or is held by another user.");
    }

    revalidatePath("/dashboard/student/hostels");
    return {
      success: true,
      holdExpiresAt: expiresAt,
    };
  } catch (err: any) {
    console.error("Error reserving room:", err);
    throw new Error(err.message || "Reservation failed.");
  }
}

export async function confirmBooking(roomId: string, userId: number) {
  try {
    // 1. Transaction to confirm booking and link student to the hostel
    const result = await prisma.$transaction(async (tx) => {
      // Find room to verify hold
      const room = await tx.room.findUnique({
        where: { id: roomId },
      });

      if (!room || room.status !== "HELD" || room.heldByUserId !== userId) {
        throw new Error("Hold on this room has expired or is invalid.");
      }

      // Check if student already has a booked room
      const existingBooking = await tx.room.findUnique({
        where: { bookedByUserId: userId },
      });
      if (existingBooking) {
        throw new Error("You already have an active hostel room booking.");
      }

      // Update room status to booked
      const updatedRoom = await tx.room.update({
        where: { id: roomId },
        data: {
          status: "BOOKED",
          bookedByUserId: userId,
          heldByUserId: null,
          holdExpiresAt: null,
        },
      });

      // Update student profile as well (link to hostel mapping if StudentHostel is used)
      const studentProfile = await tx.studentProfile.findUnique({
        where: { userId },
      });

      if (studentProfile) {
        // Create student hostel booking relation
        await tx.studentHostel.upsert({
          where: {
            studentId_hostelId: {
              studentId: studentProfile.id,
              hostelId: room.hostelId,
            },
          },
          update: {},
          create: {
            studentId: studentProfile.id,
            hostelId: room.hostelId,
          },
        });
      }

      return updatedRoom;
    });

    revalidatePath("/dashboard/student/hostels");
    revalidatePath("/dashboard/student");
    return { success: true, room: result };
  } catch (err: any) {
    console.error("Error confirming booking:", err);
    throw new Error(err.message || "Failed to confirm booking.");
  }
}

// Action to release room hold manually (e.g. if student cancels or picks another)
export async function releaseHold(roomId: string, userId: number) {
  try {
    await prisma.room.updateMany({
      where: {
        id: roomId,
        heldByUserId: userId,
        status: "HELD",
      },
      data: {
        status: "AVAILABLE",
        heldByUserId: null,
        holdExpiresAt: null,
      },
    });

    revalidatePath("/dashboard/student/hostels");
  } catch (err) {
    console.error("Error releasing hold:", err);
  }
}
