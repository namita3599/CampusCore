import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import ResidentsClient from "./ResidentsClient";

export default async function ManageResidentsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "WARDEN") redirect("/login");

  const wardenUserId = parseInt(session.user.id);

  const warden = await prisma.wardenProfile.findUnique({
    where: { userId: wardenUserId },
    select: {
      name: true,
      hostels: { select: { id: true, name: true } },
    },
  });

  if (!warden) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-zinc-500">
            Warden profile not found. Contact the admin.
          </p>
        </div>
      </div>
    );
  }

  if (warden.hostels.length === 0) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
              Warden Portal
            </p>
            <h1 className="text-2xl font-bold text-zinc-950">
              Manage Residents
            </h1>
          </div>
          <Link
            href="/dashboard/warden"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </Link>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-zinc-500 text-sm">
            No hostel has been assigned to your account yet. Contact the admin.
          </p>
        </div>
      </div>
    );
  }

  const hostelIds = warden.hostels.map((h) => h.id);
  const hostelNames = warden.hostels.map((h) => h.name).join(", ");

  // ── Fetch residents and available rooms in parallel ────────────────────────
  const [studentHostels, availableRooms] = await Promise.all([
    prisma.studentHostel.findMany({
      where: { hostelId: { in: hostelIds } },
      include: {
        student: {
          include: {
            user: {
              include: {
                bookedRoom: {
                  include: {
                    hostel: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
        hostel: { select: { id: true, name: true } },
      },
    }),
    prisma.room.findMany({
      where: {
        hostelId: { in: hostelIds },
        status: "AVAILABLE",
      },
      include: { hostel: { select: { id: true, name: true } } },
      orderBy: [{ hostel: { name: "asc" } }, { roomNumber: "asc" }],
    }),
  ]);

  // ── Normalize to clean flat shape for the client ───────────────────────────
  const residents = studentHostels
    .map((sh) => ({
      studentUserId: sh.student.userId,
      studentProfileId: sh.student.id,
      name: sh.student.name,
      rollNumber: sh.student.rollNumber,
      branch: sh.student.branch,
      hostelName: sh.hostel.name,
      hostelId: sh.hostel.id,
      currentRoom: sh.student.user.bookedRoom
        ? {
            id: sh.student.user.bookedRoom.id,
            roomNumber: sh.student.user.bookedRoom.roomNumber,
            hostelId: sh.student.user.bookedRoom.hostelId,
            hostel: sh.student.user.bookedRoom.hostel!,
          }
        : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const bookedCount = residents.filter((r) => r.currentRoom !== null).length;
  const occupiedRooms =
    availableRooms.length === 0
      ? 0
      : hostelIds.reduce((acc) => acc, 0); // available rooms are already computed

  return (
    <div className="p-8 space-y-8 animate-fadeInUp text-zinc-950">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            Warden Portal
          </p>
          <h1 className="text-2xl font-bold text-zinc-950">Manage Residents</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {hostelNames} ·{" "}
            <span className="font-semibold text-zinc-900">
              {residents.length}
            </span>{" "}
            resident{residents.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/warden"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">Total Residents</p>
          <p className="text-2xl font-extrabold text-zinc-950 mt-1">
            {residents.length}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">Rooms Assigned</p>
          <p className="text-2xl font-extrabold text-zinc-950 mt-1">
            {bookedCount}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">Available Rooms</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">
            {availableRooms.length}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">Hostels Managed</p>
          <p className="text-2xl font-extrabold text-zinc-950 mt-1">
            {warden.hostels.length}
          </p>
        </div>
      </div>

      {/* ── Interactive client ────────────────────────────────────────────────── */}
      <ResidentsClient
        residents={residents}
        availableRooms={availableRooms}
        wardenUserId={wardenUserId}
      />
    </div>
  );
}
