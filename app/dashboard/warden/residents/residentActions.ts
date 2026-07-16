"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

// ─── Type for locked row ──────────────────────────────────────────────────────
type LockedRoomRow = {
  id: string;
  status: string;
  hostelId: number;
};

// ─── Helper: get warden's hostel IDs ─────────────────────────────────────────
async function getWardenHostelIds(wardenUserId: number): Promise<number[]> {
  const warden = await prisma.wardenProfile.findUnique({
    where: { userId: wardenUserId },
    select: { hostels: { select: { id: true } } },
  });
  if (!warden) throw new Error("Warden profile not found.");
  return warden.hostels.map((h) => h.id);
}

// ─── Auth guard helper ────────────────────────────────────────────────────────
async function assertWarden(wardenUserId: number) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    parseInt(session.user.id) !== wardenUserId ||
    session.user.role !== "WARDEN"
  ) {
    throw new Error("Unauthorized.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: changeStudentRoom
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Moves a student from their current room to a new room.
 *
 * Uses SELECT ... FOR UPDATE on the new room to prevent two wardens from
 * assigning the same room to two different students simultaneously.
 *
 * Flow:
 *  1. Auth + ownership check.
 *  2. BEGIN transaction.
 *  3. SELECT FOR UPDATE the target room — acquires exclusive row-level lock.
 *  4. Validate: room is AVAILABLE and belongs to warden's hostel.
 *  5. Free old room → AVAILABLE.
 *  6. Claim new room → BOOKED.
 *  7. Update StudentHostel if the hostel changed.
 *  8. COMMIT.
 */
export async function changeStudentRoom(
  studentUserId: number,
  newRoomId: string,
  wardenUserId: number
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    await assertWarden(wardenUserId);
    const hostelIds = await getWardenHostelIds(wardenUserId);
    if (hostelIds.length === 0)
      return { success: false, message: "You have no hostels assigned." };

    await prisma.$transaction(async (tx: any) => {
      // ── STEP 1: SELECT ... FOR UPDATE — acquire exclusive row lock ──────────
      const rows = await tx.$queryRaw<LockedRoomRow[]>`
        SELECT id, status, "hostelId"
        FROM "Room"
        WHERE id = ${newRoomId}
        FOR UPDATE
      `;

      if (rows.length === 0) throw new Error("Target room not found.");
      const newRoom = rows[0];

      // Security: new room must belong to warden's hostel
      if (!hostelIds.includes(newRoom.hostelId)) {
        throw new Error("This room does not belong to your hostel.");
      }

      if (newRoom.status !== "AVAILABLE") {
        throw new Error(
          "This room is already occupied. Please select an available room."
        );
      }

      // ── STEP 2: Find and free the student's current room ───────────────────
      const currentRoom = await tx.room.findUnique({
        where: { bookedByUserId: studentUserId },
        select: { id: true, hostelId: true },
      });

      if (currentRoom) {
        await tx.room.update({
          where: { id: currentRoom.id },
          data: { status: "AVAILABLE", bookedByUserId: null },
        });
      }

      // ── STEP 3: Assign new room → BOOKED ───────────────────────────────────
      await tx.room.update({
        where: { id: newRoomId },
        data: { status: "BOOKED", bookedByUserId: studentUserId },
      });

      // ── STEP 4: Update StudentHostel if hostel changed ─────────────────────
      if (currentRoom?.hostelId !== newRoom.hostelId) {
        const studentProfile = await tx.studentProfile.findUnique({
          where: { userId: studentUserId },
          select: { id: true },
        });

        if (studentProfile) {
          // Remove old hostel assignment if it was within warden's scope
          if (
            currentRoom?.hostelId &&
            hostelIds.includes(currentRoom.hostelId)
          ) {
            await tx.studentHostel.deleteMany({
              where: {
                studentId: studentProfile.id,
                hostelId: currentRoom.hostelId,
              },
            });
          }

          // Create new hostel assignment
          await tx.studentHostel.upsert({
            where: {
              studentId_hostelId: {
                studentId: studentProfile.id,
                hostelId: newRoom.hostelId,
              },
            },
            update: {},
            create: {
              studentId: studentProfile.id,
              hostelId: newRoom.hostelId,
            },
          });
        }
      }
    }); // ← COMMIT — lock released

    revalidatePath("/dashboard/warden/residents");
    revalidatePath("/dashboard/student/hostels");
    return { success: true };
  } catch (err: any) {
    console.error("[changeStudentRoom]", err);
    return {
      success: false,
      message: err.message || "Failed to change room.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: removeStudentFromHostel
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Removes a single student from the hostel:
 *  - Frees their booked room back to AVAILABLE.
 *  - Deletes their StudentHostel record(s) for this warden's hostels.
 *
 * Scoped to warden's own hostels for security (cannot evict students
 * from hostels the warden does not manage).
 */
export async function removeStudentFromHostel(
  studentUserId: number,
  wardenUserId: number
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    await assertWarden(wardenUserId);
    const hostelIds = await getWardenHostelIds(wardenUserId);

    await prisma.$transaction(async (tx: any) => {
      // Free the room — scoped to warden's hostels only
      await tx.room.updateMany({
        where: {
          bookedByUserId: studentUserId,
          hostelId: { in: hostelIds },
        },
        data: { status: "AVAILABLE", bookedByUserId: null },
      });

      // Remove StudentHostel records within warden's scope
      const studentProfile = await tx.studentProfile.findUnique({
        where: { userId: studentUserId },
        select: { id: true },
      });

      if (studentProfile) {
        await tx.studentHostel.deleteMany({
          where: {
            studentId: studentProfile.id,
            hostelId: { in: hostelIds },
          },
        });
      }
    });

    revalidatePath("/dashboard/warden/residents");
    revalidatePath("/dashboard/student/hostels");
    return { success: true };
  } catch (err: any) {
    console.error("[removeStudentFromHostel]", err);
    return {
      success: false,
      message: err.message || "Failed to remove student.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: removeAllResidents
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Nuclear option: removes ALL residents from all hostels this warden manages.
 *  - Sets every BOOKED room in warden's hostels → AVAILABLE.
 *  - Deletes all StudentHostel records for those hostels.
 *
 * Uses a sequential Prisma batch transaction (safe without FOR UPDATE because
 * we are unconditionally updating all matching rows — no read-then-decide race).
 */
export async function removeAllResidents(
  wardenUserId: number
): Promise<
  { success: true; count: number } | { success: false; message: string }
> {
  try {
    await assertWarden(wardenUserId);
    const hostelIds = await getWardenHostelIds(wardenUserId);
    if (hostelIds.length === 0)
      return { success: false, message: "No hostels assigned." };

    const [updatedRooms] = await prisma.$transaction([
      prisma.room.updateMany({
        where: { hostelId: { in: hostelIds }, status: "BOOKED" },
        data: { status: "AVAILABLE", bookedByUserId: null },
      }),
      prisma.studentHostel.deleteMany({
        where: { hostelId: { in: hostelIds } },
      }),
    ]);

    revalidatePath("/dashboard/warden/residents");
    revalidatePath("/dashboard/student/hostels");
    revalidatePath("/dashboard/warden");
    return { success: true, count: updatedRooms.count };
  } catch (err: any) {
    console.error("[removeAllResidents]", err);
    return {
      success: false,
      message: err.message || "Failed to remove all residents.",
    };
  }
}
