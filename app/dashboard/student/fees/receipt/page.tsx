import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowLeft, Calendar, User, Hash, DollarSign } from "lucide-react";
import PrintButton from "@/components/PrintButton";

interface Props {
  searchParams: Promise<{
    invoiceId?: string;
    paymentId?: string;
  }>;
}

export default async function ReceiptPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "STUDENT") redirect("/login");

  const resolvedParams = await searchParams;
  const invoiceId = resolvedParams.invoiceId;
  const paymentId = resolvedParams.paymentId;

  if (!invoiceId) {
    redirect("/dashboard/student/fees");
  }

  // Fetch invoice details and associated transactions
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      student: {
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
      feeRecord: true,
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!invoice || invoice.student.userId !== parseInt(session.user.id)) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96 text-zinc-950">
        <div className="text-center rounded-2xl border border-zinc-200 bg-white p-12 shadow-sm max-w-md">
          <p className="text-zinc-500 font-medium">Receipt not found or unauthorized access.</p>
          <Link
            href="/dashboard/student/fees"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 hover:text-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Fees
          </Link>
        </div>
      </div>
    );
  }

  const latestTransaction = invoice.transactions[0];
  const dateFormatted = invoice.paidAt
    ? new Date(invoice.paidAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 animate-fadeInUp text-zinc-950">
      {/* Action Header - Hidden on Print */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link
          href="/dashboard/student/fees"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Fees
        </Link>

        <PrintButton />
      </div>

      {/* Premium Visual Receipt Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden print:border-none print:shadow-none">
        {/* Banner */}
        <div className="bg-zinc-950 text-white p-8 text-center space-y-4 relative">
          <div className="absolute top-4 right-4 text-xs font-mono opacity-50 uppercase tracking-widest print:hidden">
            Official E-Receipt
          </div>
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>
          <div className="space-y-1">
            <p className="text-zinc-400 text-xs uppercase tracking-[0.2em] font-medium">Payment Successful</p>
            <h2 className="text-3xl font-extrabold tracking-tight">₹{invoice.amount.toLocaleString("en-IN")}</h2>
          </div>
        </div>

        {/* Receipt Details Body */}
        <div className="p-8 space-y-8">
          {/* Institution Header */}
          <div className="flex justify-between items-start border-b border-zinc-100 pb-6">
            <div>
              <h3 className="font-extrabold text-lg text-zinc-900 uppercase tracking-wide">CampusCore ERP</h3>
              <p className="text-xs text-zinc-500">Secure Student Academic Portal</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono text-zinc-400">RECEIPT ID</p>
              <p className="text-sm font-semibold font-mono text-zinc-800">{invoice.id.toUpperCase()}</p>
            </div>
          </div>

          {/* Core Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-zinc-100 pb-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-zinc-600">
                <User className="h-4.5 w-4.5 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-400 font-medium">Student Name</p>
                  <p className="text-sm font-semibold text-zinc-800">{invoice.student.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-zinc-600">
                <Hash className="h-4.5 w-4.5 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-400 font-medium">Roll / Registration Number</p>
                  <p className="text-sm font-semibold text-zinc-800">{invoice.student.rollNumber || "Not Assigned"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-zinc-600">
                <Calendar className="h-4.5 w-4.5 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-400 font-medium">Date & Time of Payment</p>
                  <p className="text-sm font-semibold text-zinc-800">{dateFormatted}</p>
                </div>
              </div>

              {paymentId && (
                <div className="flex items-center gap-3 text-zinc-600">
                  <Hash className="h-4.5 w-4.5 text-zinc-400" />
                  <div>
                    <p className="text-xs text-zinc-400 font-medium">Razorpay Payment ID</p>
                    <p className="text-sm font-semibold font-mono text-zinc-800">{paymentId}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Fee Description</h4>
            <div className="border border-zinc-150 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-medium">
                  <tr>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-800">
                  <tr>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-zinc-900">
                        {invoice.feeRecord?.type === "TUITION" ? "Tuition Fees" : "Hostel Fees"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">{invoice.feeRecord?.term || "Current Semester"}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-zinc-900">
                      ₹{invoice.amount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Notes */}
          <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-4 text-xs text-zinc-500 space-y-1.5">
            <p className="font-semibold text-zinc-700">Important Information:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>This is a computer-generated official receipt, no signature is required.</li>
              <li>Payment has been processed securely through Razorpay test gateway client.</li>
              <li>For any payment reconciliations or disputes, please cite the Receipt ID or Payment ID above.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
