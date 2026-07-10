import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import FeesPaymentClient from "./FeesPaymentClient";

export default async function FeesPaymentPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "STUDENT") redirect("/login");

  const userId = parseInt(session.user.id);

  const [profile, settings, latestTuition, latestHostel] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        phone: true,
        tuitionPaid: true,
        hostelPaid: true,
        yearOfAdmission: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    }),
    prisma.systemSettings.findUnique({
      where: { id: 1 },
    }),
    prisma.feeRecord.findFirst({
      where: { student: { userId }, type: "TUITION" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feeRecord.findFirst({
      where: { student: { userId }, type: "HOSTEL" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const isTuitionLocked = settings?.tuitionPaymentLocked ?? false;

  if (!profile) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center rounded-2xl border border-zinc-200 bg-white p-12 shadow-sm">
          <p className="text-zinc-500">Student profile not found. Contact the admin.</p>
        </div>
      </div>
    );
  }

  // Automatically generate FeeRecord for newly registered/created students
  let currentTuition = latestTuition;
  if (!currentTuition && !profile.tuitionPaid) {
    currentTuition = await prisma.feeRecord.create({
      data: {
        studentId: profile.id,
        type: "TUITION",
        amount: 45000,
        status: "UNPAID",
        term: "Academic Year 2024–25",
        admissionYear: profile.yearOfAdmission ?? new Date().getFullYear(),
      },
    });
  }

  let currentHostel = latestHostel;
  if (!currentHostel && !profile.hostelPaid) {
    currentHostel = await prisma.feeRecord.create({
      data: {
        studentId: profile.id,
        type: "HOSTEL",
        amount: 25000,
        status: "UNPAID",
        term: "includes mess and utilities",
        admissionYear: profile.yearOfAdmission ?? new Date().getFullYear(),
      },
    });
  }

  const tuitionPaid = currentTuition ? currentTuition.status === "PAID" : profile.tuitionPaid;
  const hostelPaid = currentHostel ? currentHostel.status === "PAID" : profile.hostelPaid;
  const tuitionAmount = currentTuition ? currentTuition.amount : 45000;
  const hostelAmount = currentHostel ? currentHostel.amount : 25000;
  const tuitionTerm = currentTuition ? currentTuition.term : "Academic Year 2024–25";
  const hostelTerm = currentHostel ? currentHostel.term : "includes mess and utilities";

  // Check or create Invoice records for any unpaid FeeRecord
  let tuitionInvoiceId = "";
  let hostelInvoiceId = "";

  if (currentTuition && currentTuition.status === "UNPAID") {
    let tInv = await prisma.invoice.findFirst({
      where: {
        studentId: profile.id,
        feeRecordId: currentTuition.id,
      },
    });
    if (!tInv) {
      tInv = await prisma.invoice.create({
        data: {
          studentId: profile.id,
          amount: tuitionAmount,
          feeRecordId: currentTuition.id,
          isPaid: false,
        },
      });
    }
    tuitionInvoiceId = tInv.id;
  }

  if (currentHostel && currentHostel.status === "UNPAID") {
    let hInv = await prisma.invoice.findFirst({
      where: {
        studentId: profile.id,
        feeRecordId: currentHostel.id,
      },
    });
    if (!hInv) {
      hInv = await prisma.invoice.create({
        data: {
          studentId: profile.id,
          amount: hostelAmount,
          feeRecordId: currentHostel.id,
          isPaid: false,
        },
      });
    }
    hostelInvoiceId = hInv.id;
  }

  return (
    <div className="p-8 space-y-8 animate-fadeInUp text-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Student Portal</p>
          <h1 className="text-2xl font-bold text-zinc-950">Fee Payments</h1>
          <p className="text-zinc-500 text-sm mt-1">Review outstanding tuition or hostel dues and make payments.</p>
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
 
      <FeesPaymentClient
        profileId={profile.id}
        initialTuitionPaid={tuitionPaid}
        initialHostelPaid={hostelPaid}
        isTuitionLocked={isTuitionLocked}
        tuitionAmount={tuitionAmount}
        hostelAmount={hostelAmount}
        tuitionTerm={tuitionTerm}
        hostelTerm={hostelTerm}
        userId={userId}
        studentName={profile.name}
        studentEmail={profile.user?.email || undefined}
        studentPhone={profile.phone || undefined}
        tuitionInvoiceId={tuitionInvoiceId || undefined}
        hostelInvoiceId={hostelInvoiceId || undefined}
      />
    </div>
  );
}
