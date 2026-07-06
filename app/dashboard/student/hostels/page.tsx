import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import HostelSelectionClient from "./HostelSelectionClient";

export default async function StudentHostelsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "STUDENT") redirect("/login");

  const userId = parseInt(session.user.id);

  // Check if student already has a booked room or an active hold
  const [bookedRoom, heldRoom, hostels] = await Promise.all([
    prisma.room.findFirst({
      where: { bookedByUserId: userId },
      include: { hostel: true },
    }),
    prisma.room.findFirst({
      where: {
        heldByUserId: userId,
        status: "HELD",
        holdExpiresAt: { gt: new Date() },
      },
      include: { hostel: true },
    }),
    prisma.hostel.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="p-8 space-y-8 animate-fadeInUp text-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Student Portal</p>
          <h1 className="text-2xl font-bold text-zinc-950">Hostel Allocation</h1>
          <p className="text-zinc-500 text-sm mt-1">Book your room in campus hostels using our secure lock-hold system.</p>
        </div>

        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <HostelSelectionClient
        userId={userId}
        initialBookedRoom={bookedRoom}
        initialHeldRoom={heldRoom}
        hostels={hostels}
      />
    </div>
  );
}
