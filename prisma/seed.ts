import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set in .env");

const adapter = new PrismaPg({ connectionString });
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
  const hostel2 = await prisma.hostel.upsert({
    where: { name: "Hostel B" },
    update: {},
    create: { name: "Hostel B" },
  });
  console.log(`✅ Hostels created`);

  // Create rooms for Hostel A
  const roomsA = ["A-101", "A-102", "A-103", "A-104", "A-105"];
  for (const rNum of roomsA) {
    await prisma.room.upsert({
      where: { roomNumber: rNum },
      update: {},
      create: {
        roomNumber: rNum,
        status: "AVAILABLE",
        hostelId: hostel1.id,
      },
    });
  }

  // Create rooms for Hostel B
  const roomsB = ["B-101", "B-102", "B-103", "B-104", "B-105"];
  for (const rNum of roomsB) {
    await prisma.room.upsert({
      where: { roomNumber: rNum },
      update: {},
      create: {
        roomNumber: rNum,
        status: "AVAILABLE",
        hostelId: hostel2.id,
      },
    });
  }
  console.log(`✅ Rooms created`);

  // Demo teacher — create user first, then link subject
  const hashedTeacherPwd = await bcrypt.hash("teacher123", 12);
  const teacherUser = await prisma.user.upsert({
    where: { username: "teacher_john" },
    update: {},
    create: {
      username: "teacher_john",
      hashedPassword: hashedTeacherPwd,
      role: Role.TEACHER,
      teacherProfile: {
        create: { name: "John Smith" },
      },
    },
    include: { teacherProfile: true },
  });
  if (teacherUser.teacherProfile) {
    await prisma.subject.update({
      where: { id: subject3.id },
      data: { teacherId: teacherUser.teacherProfile.id },
    });
  }
  console.log(`✅ Demo teacher created: ${teacherUser.username}`);

  // Demo warden — create user first, then link hostel
  const hashedWardenPwd = await bcrypt.hash("warden123", 12);
  const wardenUser = await prisma.user.upsert({
    where: { username: "warden_mary" },
    update: {},
    create: {
      username: "warden_mary",
      hashedPassword: hashedWardenPwd,
      role: Role.WARDEN,
      wardenProfile: {
        create: { name: "Mary Johnson" },
      },
    },
    include: { wardenProfile: true },
  });
  if (wardenUser.wardenProfile) {
    await prisma.hostel.update({
      where: { id: hostel1.id },
      data: { wardenId: wardenUser.wardenProfile.id },
    });
  }
  console.log(`✅ Demo warden created: ${wardenUser.username}`);

  // Demo student
  const hashedStudentPwd = await bcrypt.hash("student123", 12);
  const studentUser = await prisma.user.upsert({
    where: { username: "co_cse-2026-001" },
    update: {},
    create: {
      username: "co_cse-2026-001",
      hashedPassword: hashedStudentPwd,
      role: Role.STUDENT,
      studentProfile: {
        create: {
          name: "Alice Kumar",
          branch: "Computer Science",
          rollNumber: "CSE-2026-001",
          phone: "9876543210",
          guardianName: "Ramesh Kumar",
          yearOfAdmission: 2026,
          bloodGroup: "O+",
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
  console.log("  Student → username: co_cse-2026-001 | password: student123");
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
