import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function toCSV(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const escape = (v: string | number | boolean | null | undefined) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const report = searchParams.get("report"); // "defaulters" | "orphans"

  if (report === "defaulters") {
    const defaulters = await prisma.studentProfile.findMany({
      where: { OR: [{ tuitionPaid: false }, { hostelPaid: false }] },
      select: {
        name: true,
        branch: true,
        rollNumber: true,
        phone: true,
        tuitionPaid: true,
        hostelPaid: true,
        user: { select: { email: true, username: true } },
        studentHostels: { select: { hostelId: true } },
      },
      orderBy: { branch: "asc" },
    });

    const headers = ["Name", "Username", "Email", "Branch", "Roll Number", "Phone", "Tuition Paid", "Hostel Paid"];
    const rows = defaulters.map((s) => [
      s.name,
      s.user.username,
      s.user.email ?? "",
      s.branch,
      s.rollNumber ?? "",
      s.phone ?? "",
      s.tuitionPaid ? "Yes" : "No",
      s.hostelPaid ? "Yes" : "No",
    ]);

    const csv = toCSV(headers, rows);
    const now = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="CampusCore_Defaulters_${now}.csv"`,
      },
    });
  }

  if (report === "orphans") {
    const [subjectsWithoutTeacher, hostelsWithoutWarden] = await Promise.all([
      prisma.subject.findMany({
        where: { teacherId: null },
        select: { name: true },
      }),
      prisma.hostel.findMany({
        where: { wardenId: null },
        select: { name: true },
      }),
    ]);

    const headers = ["Type", "Name", "Issue"];
    const rows: string[][] = [
      ...subjectsWithoutTeacher.map((s) => ["Subject", s.name, "No teacher assigned"]),
      ...hostelsWithoutWarden.map((h) => ["Hostel", h.name, "No warden assigned"]),
    ];

    const csv = toCSV(headers, rows);
    const now = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="CampusCore_Orphans_${now}.csv"`,
      },
    });
  }

  return new NextResponse("Invalid report type", { status: 400 });
}
