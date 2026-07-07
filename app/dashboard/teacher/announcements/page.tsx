import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import AnnouncementsView from "@/components/AnnouncementsView";

export default async function TeacherAnnouncementsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "TEACHER") redirect("/login");

  return <AnnouncementsView />;
}
