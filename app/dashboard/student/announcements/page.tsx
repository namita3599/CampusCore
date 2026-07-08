import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import AnnouncementsView from "@/components/AnnouncementsView";

export default async function StudentAnnouncementsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "STUDENT") redirect("/login");

  const userId = parseInt(session.user.id);

  return <AnnouncementsView userId={userId} userRole="STUDENT" />;
}
