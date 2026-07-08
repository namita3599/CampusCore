import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export default async function StudentProfilePage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "STUDENT") redirect("/login");

  const userId = parseInt(session.user.id);

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          username: true,
          email: true,
        },
      },
    },
  });

  if (!profile) redirect("/dashboard/student");

  return <ProfileClient student={profile} />;
}
