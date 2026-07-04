import { PrismaClient, Role } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import "dotenv/config";

function parseConnectionUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    connectionLimit: 5,
  };
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set in .env");

const adapter = new PrismaMariaDb(parseConnectionUrl(databaseUrl));
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Admin user
  const hashedAdminPassword = await bcrypt.hash("adminPassword123", 12);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      hashedPassword: hashedAdminPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin user created: ${admin.username}`);

  // Demo subjects
  const subject1 = await prisma.subject.upsert({
    where: { name: "Mathematics" },
    update: {},
    create: { name: "Mathematics" },
  });
  const subject2 = await prisma.subject.upsert({
    where: { name: "Physics" },
    update: {},
    create: { name: "Physics" },
  });
  const subject3 = await prisma.subject.upsert({
    where: { name: "Computer Science" },
    update: {},
    create: { name: "Computer Science" },
  });
  console.log(`✅ Subjects created`);

  // Demo hostels
  const hostel1 = await prisma.hostel.upsert({
    where: { name: "Hostel A" },
    update: {},
    create: { name: "Hostel A" },
  });
  await prisma.hostel.upsert({
    where: { name: "Hostel B" },
    update: {},
    create: { name: "Hostel B" },
  });
  console.log(`✅ Hostels created`);

  // Demo teacher
  const hashedTeacherPwd = await bcrypt.hash("teacher123", 12);

  // First, create or find the teacher user (without subject)
  const teacherUser = await prisma.user.upsert({
    where: { username: "teacher_john" },
    update: {},
    create: {
      username: "teacher_john",
      hashedPassword: hashedTeacherPwd,
      role: Role.TEACHER,
      teacherProfile: {
        create: {
          name: "John Smith",
        },
      },
    },
    include: { teacherProfile: true },
  });

  // Then connect the subject to the teacher profile (avoids circular creation issues)
  if (teacherUser.teacherProfile && subject3) {
    await prisma.subject.update({
      where: { id: subject3.id },
      data: { teacherId: teacherUser.teacherProfile.id },
    });
  }
  console.log(`✅ Demo teacher created: ${teacherUser.username}`);

  // Demo warden
  const hashedWardenPwd = await bcrypt.hash("warden123", 12);

  const wardenUser = await prisma.user.upsert({
    where: { username: "warden_mary" },
    update: {},
    create: {
      username: "warden_mary",
      hashedPassword: hashedWardenPwd,
      role: Role.WARDEN,
      wardenProfile: {
        create: {
          name: "Mary Johnson",
        },
      },
    },
    include: { wardenProfile: true },
  });

  if (wardenUser.wardenProfile && hostel1) {
    await prisma.hostel.update({
      where: { id: hostel1.id },
      data: { wardenId: wardenUser.wardenProfile.id },
    });
  }
  console.log(`✅ Demo warden created: ${wardenUser.username}`);

  // Demo student
  const hashedStudentPwd = await bcrypt.hash("student123", 12);
  const studentUser = await prisma.user.upsert({
    where: { username: "student_alice" },
    update: {},
    create: {
      username: "student_alice",
      hashedPassword: hashedStudentPwd,
      role: Role.STUDENT,
      studentProfile: {
        create: {
          name: "Alice Kumar",
          branch: "Computer Science",
        },
      },
    },
  });
  console.log(`✅ Demo student created: ${studentUser.username}`);

  console.log("\n🎉 Seeding complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Default credentials:");
  console.log("  Admin   → username: admin        | password: adminPassword123");
  console.log("  Teacher → username: teacher_john | password: teacher123");
  console.log("  Warden  → username: warden_mary  | password: warden123");
  console.log("  Student → username: student_alice | password: student123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
