import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "student" | "teacher" | "warden"

  const wb = XLSX.utils.book_new();
  let headers: string[] = [];
  let sampleData: Record<string, string | number>[] = [];
  let filename = "template.xlsx";

  if (type === "student") {
    headers = [
      "Name",
      "Branch",
      "Roll Number",
      "Phone",
      "Guardian Name",
      "Year of Admission",
      "Blood Group",
      "Email",
    ];
    sampleData = [
      {
        Name: "Rahul Gupta",
        Branch: "Computer Science",
        "Roll Number": "CSE-2026-014",
        Phone: "9876543210",
        "Guardian Name": "Rajesh Kumar",
        "Year of Admission": 2026,
        "Blood Group": "O+",
        Email: "rahul@example.com",
      },
    ];
    filename = "CampusCore_Student_Template.xlsx";
  } else if (type === "teacher") {
    headers = ["Name", "Phone", "Email", "Subject Name"];
    sampleData = [
      {
        Name: "Dr. Ramesh Sharma",
        Phone: "9876543211",
        Email: "ramesh.sharma@example.com",
        "Subject Name": "Data Structures",
      },
    ];
    filename = "CampusCore_Teacher_Template.xlsx";
  } else if (type === "warden") {
    headers = ["Name", "Phone", "Email", "Hostel Name"];
    sampleData = [
      {
        Name: "Mrs. Sunita Kapoor",
        Phone: "9876543212",
        Email: "sunita.kapoor@example.com",
        "Hostel Name": "Hostel C",
      },
    ];
    filename = "CampusCore_Warden_Template.xlsx";
  } else {
    return new NextResponse("Invalid template type", { status: 400 });
  }

  const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
  // Auto-width columns
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 18) }));
  XLSX.utils.book_append_sheet(wb, ws, "Template");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
