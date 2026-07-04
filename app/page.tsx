import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const roleMap: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  STUDENT: "/dashboard/student",
  TEACHER: "/dashboard/teacher",
  WARDEN: "/dashboard/warden",
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role) {
    redirect(roleMap[session.user.role]);
  }

  redirect("/login");
}
