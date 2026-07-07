import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "students" | "teachers" | "wardens" | "all"

  const wb = XLSX.utils.book_new();

  // ── Students ───────────────────────────────────────────────────────
  if (!type || type === "students" || type === "all") {
    const students = await prisma.studentProfile.findMany({
      select: {
        id: true,
        name: true,
        branch: true,
        rollNumber: true,
        phone: true,
        guardianName: true,
        yearOfAdmission: true,
        bloodGroup: true,
        courseRegistered: true,
        tuitionPaid: true,
        hostelPaid: true,
        user: { select: { username: true, email: true, createdAt: true } },
      },
      orderBy: { id: "asc" },
    });

    const studentRows = students.map((s, i) => ({
      "#": i + 1,
      Name: s.name,
      Username: s.user.username,
      Email: s.user.email ?? "",
      Branch: s.branch,
      "Roll Number": s.rollNumber ?? "",
      Phone: s.phone ?? "",
      "Guardian Name": s.guardianName ?? "",
      "Year of Admission": s.yearOfAdmission ?? "",
      "Blood Group": s.bloodGroup ?? "",
      "Course Registered": s.courseRegistered ? "Yes" : "No",
      "Tuition Paid": s.tuitionPaid ? "Yes" : "No",
      "Hostel Paid": s.hostelPaid ? "Yes" : "No",
      "Joined On": new Date(s.user.createdAt).toLocaleDateString("en-IN"),
    }));

    const ws = XLSX.utils.json_to_sheet(studentRows);
    // Auto-width columns
    ws["!cols"] = Object.keys(studentRows[0] ?? {}).map((key) => ({
      wch: Math.max(key.length + 2, 14),
    }));
    XLSX.utils.book_append_sheet(wb, ws, "Students");
  }

  // ── Teachers ───────────────────────────────────────────────────────
  if (!type || type === "teachers" || type === "all") {
    const teachers = await prisma.teacherProfile.findMany({
      include: { user: { select: { username: true, email: true } }, subjects: true },
      orderBy: { id: "asc" },
    });

    const teacherRows = teachers.map((t, i) => ({
      "#": i + 1,
      Name: t.name,
      Username: t.user.username,
      Email: t.user.email ?? "",
      "Assigned Subject": t.subjects.map((s) => s.name).join(", ") || "Not Assigned",
    }));

    const ws = XLSX.utils.json_to_sheet(teacherRows);
    ws["!cols"] = Object.keys(teacherRows[0] ?? {}).map((key) => ({
      wch: Math.max(key.length + 2, 18),
    }));
    XLSX.utils.book_append_sheet(wb, ws, "Teachers");
  }

  // ── Wardens ────────────────────────────────────────────────────────
  if (!type || type === "wardens" || type === "all") {
    const wardens = await prisma.wardenProfile.findMany({
      include: { user: { select: { username: true, email: true } }, hostels: true },
      orderBy: { id: "asc" },
    });

    const wardenRows = wardens.map((w, i) => ({
      "#": i + 1,
      Name: w.name,
      Username: w.user.username,
      Email: w.user.email ?? "",
      "Assigned Hostel": w.hostels.map((h) => h.name).join(", ") || "Not Assigned",
    }));

    const ws = XLSX.utils.json_to_sheet(wardenRows);
    ws["!cols"] = Object.keys(wardenRows[0] ?? {}).map((key) => ({
      wch: Math.max(key.length + 2, 18),
    }));
    XLSX.utils.book_append_sheet(wb, ws, "Wardens");
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const now = new Date().toISOString().slice(0, 10);
  const label =
    type === "students"
      ? "Students"
      : type === "teachers"
      ? "Teachers"
      : type === "wardens"
      ? "Wardens"
      : "All-Users";

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="CampusCore_${label}_${now}.xlsx"`,
    },
  });
}
