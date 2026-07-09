import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Dumping profiles and relations for user IDs 6 and 9...");

  for (const id of [6, 9]) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: {
          include: {
            studentSubjects: { include: { subject: true } },
            complaints: { include: { subject: true, hostel: true } },
          },
        },
      },
    });

    if (user) {
      console.log(`\n=== USER ID ${id} ===`);
      console.log(`Username: ${user.username}, Role: ${user.role}`);
      if (user.studentProfile) {
        console.log("Student Profile ID:", user.studentProfile.id);
        console.log("Student Profile Name:", user.studentProfile.name);
        console.log("Enrolled Subjects count:", user.studentProfile.studentSubjects.length);
        console.log("Enrolled Subjects:", user.studentProfile.studentSubjects.map(ss => ({ id: ss.subjectId, name: ss.subject.name })));
        console.log("Complaints count:", user.studentProfile.complaints.length);
        console.log("Complaints:", user.studentProfile.complaints.map(c => ({ id: c.id, title: c.title })));
      } else {
        console.log("No student profile found for this user.");
      }
    }
  }
}

main().catch(console.error);
