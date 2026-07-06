import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Sidebar from "./components/Sidebar";
import ForcePasswordChangeModal from "./components/ForcePasswordChangeModal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userId = Number(session.user.id);
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { forcePasswordChange: true, role: true, username: true },
  });

  const mustChangePassword = dbUser?.forcePasswordChange && dbUser?.role !== "ADMIN";

  if (mustChangePassword) {
    return (
      <div className="h-screen w-screen bg-zinc-950 overflow-hidden">
        <ForcePasswordChangeModal userId={userId} username={dbUser.username} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden text-zinc-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full bg-zinc-50">
          {children}
        </div>
      </main>
    </div>
  );
}
