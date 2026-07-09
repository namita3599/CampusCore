import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import WardenComplaintsClient from "./WardenComplaintsClient";

export default async function WardenComplaintsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "WARDEN") redirect("/login");

  const userId = Number(session.user.id);

  const warden = await prisma.wardenProfile.findUnique({
    where: { userId },
    include: { hostels: true },
  });

  if (!warden) {
    return (
      <div className="p-8 text-center bg-white border border-zinc-200 rounded-2xl max-w-md mx-auto mt-12 shadow-sm">
        <p className="text-zinc-500 font-medium">Warden profile not found. Contact administrator.</p>
      </div>
    );
  }

  const hostelIds = warden.hostels.map((h) => h.id);

  const complaints = await prisma.complaint.findMany({
    where: {
      category: "HOSTEL",
      hostelId: { in: hostelIds },
    },
    include: {
      student: true,
      hostel: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const mappedComplaints = complaints.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    resolvedAt: c.resolvedAt ? c.resolvedAt.toISOString() : null,
    resolution: c.resolution,
    student: {
      id: c.student.id,
      name: c.student.name,
      rollNumber: c.student.rollNumber,
      branch: c.student.branch,
    },
    hostel: c.hostel ? { id: c.hostel.id, name: c.hostel.name } : null,
  }));

  return <WardenComplaintsClient initialComplaints={mappedComplaints} />;
}
