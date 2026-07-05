import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Sidebar from "./components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
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
