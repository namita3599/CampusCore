"use server";

/**
 * ============================================================================
 * hostelActions.ts — Hostel Room Allocation Module
 * CampusCore ERP | Next.js Server Actions
 * ============================================================================
 *
 * CONCURRENCY STRATEGY: PESSIMISTIC LOCKING (SELECT ... FOR UPDATE)
 * -----------------------------------------------------------------
 *
 * WHY PESSIMISTIC LOCKING?
 * Pessimistic locking takes the philosophy:
 *   "ASSUME a conflict WILL happen. Lock the row BEFORE reading it."
 *
 * HOW SELECT ... FOR UPDATE WORKS IN POSTGRESQL
 * ----------------------------------------------
 * When Transaction A executes:
 *   SELECT * FROM "Room" WHERE id = $1 FOR UPDATE;
 *
 * PostgreSQL places an exclusive row-level lock on that specific row.
 * Any other transaction (B, C, D...) that tries to also run:
 *   SELECT * FROM "Room" WHERE id = $1 FOR UPDATE;
 *   -- or any UPDATE/DELETE on that row --
 * will be BLOCKED and queued at the database kernel level.
 *
 * Transaction B does not waste CPU spinning. It literally sleeps inside
 * the PostgreSQL process until Transaction A either COMMITs or ROLLBACKs.
 * The moment A ends, PostgreSQL wakes B up, grants it the lock, and B reads
 * the NOW-COMMITTED state of the row (status = "BOOKED"), then throws.
 *
 * TIMELINE OF A RACE CONDITION (3 concurrent students, 1 room):
 *
 *  Student A        Student B        Student C        PostgreSQL
 *  ---------        ---------        ---------        ----------
 *  BEGIN TXN        BEGIN TXN        BEGIN TXN
 *  SELECT FOR UPDATE ─────────────────────────────> acquires row lock  (ok)
 *                   SELECT FOR UPDATE ────────────> BLOCKED (waits)
 *                                    SELECT FOR UPDATE > BLOCKED (waits)
 *  room.status = AVAILABLE  (ok)
 *  UPDATE status = BOOKED
 *  COMMIT ─────────────────────────────────────────> releases lock
 *                   <───────────────────────────── lock granted to B
 *                   room.status = BOOKED  (fail)
 *                   THROW "Room already booked"
 *                   ROLLBACK ───────────────────────> releases lock
 *                                    <─────────── lock granted to C
 *                                    room.status = BOOKED  (fail)
 *                                    THROW "Room already booked"
 *                                    ROLLBACK
 *
 * Result: Exactly ONE student gets the room. Zero double-bookings. Ever.
 *
 * PRISMA INTERACTIVE TRANSACTIONS
 * --------------------------------
 * prisma.$transaction(callback) pins all queries to ONE database connection
 * for the entire callback lifetime. This is mandatory because FOR UPDATE
 * locks are connection-scoped — they only hold for the enclosing transaction.
 *
 * ============================================================================
 */

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Type Definition ─────────────────────────────────────────────────────────

/**
 * Raw shape returned by our SELECT FOR UPDATE query.
 * Explicit typing is required because $queryRaw returns unknown[].
 */
type LockedRoomRow = {
  id: string;
  status: string;
  hostelId: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: getAvailableRooms
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all rooms for the student selection UI.
 * No HELD state exists in this simplified direct-booking flow, so only
 * AVAILABLE and BOOKED statuses are present. No cleanup pass needed.
 */
export async function getAvailableRooms() {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        hostel: { select: { id: true, name: true } },
      },
      orderBy: [{ hostel: { name: "asc" } }, { roomNumber: "asc" }],
    });
    return rooms;
  } catch (err: any) {
    console.error("[getAvailableRooms] Error fetching rooms:", err);
    throw new Error("Failed to load rooms list.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: bookRoom  (PESSIMISTIC LOCKING — DIRECT BOOKING)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Immediately books a room for the given student when they click "Select".
 * No intermediate HELD/hold state — the room transitions directly from
 * AVAILABLE → BOOKED inside a single locked transaction.
 *
 * Flow:
 *  1. Pre-flight: check student does not already have a booking (no lock needed).
 *  2. BEGIN transaction on a pinned connection.
 *  3. SELECT FOR UPDATE — acquires exclusive row-level lock on the room.
 *  4. Evaluate: room must be AVAILABLE post-lock (ground truth).
 *  5. Inner duplicate check (defense-in-depth).
 *  6. tx.room.update — AVAILABLE → BOOKED.
 *  7. Upsert StudentHostel relation.
 *  8. COMMIT (lock released) or ROLLBACK (any error).
 *
 * Returns:
 *  { success: true, room }              — booking confirmed immediately.
 *  { success: false, message: string }  — student lost the race condition.
 */
export async function bookRoom(
  roomId: string,
  userId: number
): Promise<{ success: true; room: any } | { success: false; message: string }> {
  try {
    // ── Pre-flight Check (outside the lock) ──────────────────────────────────
    // Short-circuit the obvious case: student already has a booking.
    // Non-competing read — no lock needed here.
    const existingBooking = await prisma.room.findUnique({
      where: { bookedByUserId: userId },
    });
    if (existingBooking) {
      return {
        success: false,
        message: "You already have an active hostel room booking.",
      };
    }

    // ── Hostel Fee Gate ───────────────────────────────────────────────────────
    // A student must pay the hostel fee before they can book a room.
    // We check hostelPaid on the StudentProfile — this field is set to true
    // by verifyPayment() and the Razorpay webhook after a successful payment.
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { hostelPaid: true },
    });

    if (!studentProfile?.hostelPaid) {
      return {
        success: false,
        message: "HOSTEL_FEE_UNPAID", // Sentinel used by the UI to show a payment link
      };
    }

    // ── Pessimistic Locking Transaction ──────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // ── STEP 1: SELECT ... FOR UPDATE (Acquire the Mutex) ──────────────────
      //
      // PostgreSQL will:
      //  a) Locate the row in "Room" matching roomId.
      //  b) Acquire an EXCLUSIVE ROW-LEVEL LOCK on that specific row.
      //  c) Return the row's current committed data to this transaction.
      //
      // Any concurrent transaction targeting this same row will BLOCK here
      // until we COMMIT or ROLLBACK — physically serializing all booking
      // attempts for the same room without a single race condition possible.
      //
      // $queryRaw uses parameterized queries — safe against SQL injection.
      // Double-quoted identifiers are required for Prisma's PascalCase table names.
      const rows = await tx.$queryRaw<LockedRoomRow[]>`
        SELECT id, status, "hostelId"
        FROM "Room"
        WHERE id = ${roomId}
        FOR UPDATE
      `;
      // ── Lock acquired. No concurrent transaction can touch this row now. ────

      if (rows.length === 0) {
        throw new Error("Room not found.");
      }

      const lockedRoom = rows[0];

      // ── STEP 2: Evaluate State (ground truth, post-lock) ───────────────────
      //
      // Inside the critical section. State reflects all prior committed writes.
      // If Student B arrives after Student A committed BOOKED, B sees BOOKED
      // here and throws — triggering automatic ROLLBACK and lock release.
      if (lockedRoom.status !== "AVAILABLE") {
        throw new Error(
          lockedRoom.status === "BOOKED"
            ? "This room has already been booked by another student."
            : "This room is not available for booking."
        );
      }

      // ── STEP 3: Inner duplicate booking check (defense-in-depth) ───────────
      const existingInner = await tx.room.findUnique({
        where: { bookedByUserId: userId },
      });
      if (existingInner) {
        throw new Error("You already have an active hostel room booking.");
      }

      // ── STEP 4: AVAILABLE → BOOKED ─────────────────────────────────────────
      //
      // Standard Prisma ORM update on the same pinned connection — operates on
      // the already-locked row. COMMIT releases the lock after this returns.
      const bookedRoom = await tx.room.update({
        where: { id: roomId },
        data: {
          status: "BOOKED",
          bookedByUserId: userId,
        },
        include: {
          hostel: { select: { id: true, name: true } },
        },
      });

      // ── STEP 5: Upsert the StudentHostel relation ───────────────────────────
      const studentProfile = await tx.studentProfile.findUnique({
        where: { userId },
      });

      if (studentProfile) {
        await tx.studentHostel.upsert({
          where: {
            studentId_hostelId: {
              studentId: studentProfile.id,
              hostelId: lockedRoom.hostelId,
            },
          },
          update: {},
          create: {
            studentId: studentProfile.id,
            hostelId: lockedRoom.hostelId,
          },
        });
      }

      return bookedRoom;
    }); // ← COMMIT. Room is permanently BOOKED. Lock released.

    revalidatePath("/dashboard/student/hostels");
    revalidatePath("/dashboard/student");
    return { success: true, room: result };
  } catch (err: any) {
    // Any throw inside $transaction auto-triggers ROLLBACK + lock release.
    console.error("[bookRoom] Pessimistic lock transaction failed:", err);
    return {
      success: false,
      message: err.message || "Booking failed. Please try again.",
    };
  }
}
