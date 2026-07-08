import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import AdminFeesClient from "./AdminFeesClient";

export default async function AdminFeesPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/login");

  const raw = await prisma.feeRecord.findMany({
    include: {
      student: {
        include: { user: { select: { username: true } } },
      },
    },
    orderBy: [{ admissionYear: "desc" }, { student: { name: "asc" } }],
  });

  const feeRecords = raw.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    type: r.type as "TUITION" | "HOSTEL",
    amount: r.amount,
    status: r.status as "PAID" | "UNPAID",
    term: r.term,
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
    admissionYear: r.admissionYear,
    student: {
      name: r.student.name,
      rollNumber: r.student.rollNumber,
      user: { username: r.student.user.username },
    },
  }));

  return <AdminFeesClient feeRecords={feeRecords} />;
}
