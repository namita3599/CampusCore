/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║               CampusCore – Multi-Tenant Seed Script                          ║
 * ║                         prisma/seed.ts                                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Seeds a single demo institution ("demo2024") with all demo users.
 * Uses the same Genesis Flow pattern as registerInstitution.ts:
 *   1. Upsert the Institution row
 *   2. Upsert all other rows with institutionId stamped
 *
 * Run with:
 *   npx prisma db seed
 */

import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set in .env");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ── Demo institution slug (Institution Code users type at login) ───────────────
const DEMO_SLUG = "demo2024";

async function main() {
  console.log("🌱 Seeding multi-tenant database...");

  // ── 1. Upsert the demo Institution (Tenant) ────────────────────────────────
  const institution = await prisma.institution.upsert({
    where: { slug: DEMO_SLUG },
    update: { name: "CampusCore Demo College" },
    create: {
      name: "CampusCore Demo College",
      slug: DEMO_SLUG,
    },
  });
  console.log(`✅ Institution: "${institution.name}" (slug: ${institution.slug}, id: ${institution.id})`);

  const iid = institution.id; // shorthand for institutionId

  // ── 2. Admin user ─────────────────────────────────────────────────────────
  const hashedAdminPassword = await bcrypt.hash("adminPassword123", 12);
  const admin = await prisma.user.upsert({
    where: { institutionId_username: { institutionId: iid, username: "admin" } },
    update: {},
    create: {
      institutionId: iid,
      username: "admin",
      hashedPassword: hashedAdminPassword,
      role: Role.ADMIN,
      forcePasswordChange: false,
    },
  });
  console.log(`✅ Admin user: ${admin.username}`);

  // ── 3. Demo SystemSettings (per-tenant singleton) ─────────────────────────
  // The DB may already have a legacy row with id=1 from the old single-tenant schema.
  // We upsert by institutionId if a row already exists, otherwise we try create.
  // We use a raw "INSERT ... ON CONFLICT DO UPDATE" to safely handle both cases.
  await prisma.$executeRawUnsafe(`
    INSERT INTO "SystemSettings" ("institutionId", "courseRegistrationLocked", "tuitionPaymentLocked")
    VALUES ($1, false, false)
    ON CONFLICT DO NOTHING
  `, iid);
  // If the legacy row exists without institutionId, stamp it (no LIMIT in PG UPDATE)
  await prisma.$executeRawUnsafe(`
    UPDATE "SystemSettings" SET "institutionId" = $1
    WHERE "institutionId" IS NULL
      AND ctid = (SELECT ctid FROM "SystemSettings" WHERE "institutionId" IS NULL LIMIT 1)
  `, iid);
  console.log(`✅ SystemSettings ready for institution`);

  // ── 4. Demo subjects ───────────────────────────────────────────────────────
  const subject1 = await prisma.subject.upsert({
    where: { institutionId_name: { institutionId: iid, name: "Mathematics" } },
    update: {},
    create: { institutionId: iid, name: "Mathematics" },
  });
  const subject2 = await prisma.subject.upsert({
    where: { institutionId_name: { institutionId: iid, name: "Physics" } },
    update: {},
    create: { institutionId: iid, name: "Physics" },
  });
  const subject3 = await prisma.subject.upsert({
    where: { institutionId_name: { institutionId: iid, name: "Computer Science" } },
    update: {},
    create: { institutionId: iid, name: "Computer Science" },
  });
  console.log(`✅ Subjects created`);

  // ── 5. Demo hostels ────────────────────────────────────────────────────────
  const hostel1 = await prisma.hostel.upsert({
    where: { institutionId_name: { institutionId: iid, name: "Hostel A" } },
    update: {},
    create: { institutionId: iid, name: "Hostel A" },
  });
  const hostel2 = await prisma.hostel.upsert({
    where: { institutionId_name: { institutionId: iid, name: "Hostel B" } },
    update: {},
    create: { institutionId: iid, name: "Hostel B" },
  });
  console.log(`✅ Hostels created`);

  // ── 6. Rooms ───────────────────────────────────────────────────────────────
  for (const rNum of ["A-101", "A-102", "A-103", "A-104", "A-105"]) {
    await prisma.room.upsert({
      where: { institutionId_roomNumber: { institutionId: iid, roomNumber: rNum } },
      update: {},
      create: { institutionId: iid, roomNumber: rNum, status: "AVAILABLE", hostelId: hostel1.id },
    });
  }
  for (const rNum of ["B-101", "B-102", "B-103", "B-104", "B-105"]) {
    await prisma.room.upsert({
      where: { institutionId_roomNumber: { institutionId: iid, roomNumber: rNum } },
      update: {},
      create: { institutionId: iid, roomNumber: rNum, status: "AVAILABLE", hostelId: hostel2.id },
    });
  }
  console.log(`✅ Rooms created`);

  // ── 7. Demo teacher ────────────────────────────────────────────────────────
  const hashedTeacherPwd = await bcrypt.hash("teacher123", 12);
  const teacherUser = await prisma.user.upsert({
    where: { institutionId_username: { institutionId: iid, username: "teacher_john" } },
    update: {},
    create: {
      institutionId: iid,
      username: "teacher_john",
      hashedPassword: hashedTeacherPwd,
      role: Role.TEACHER,
      teacherProfile: {
        create: { institutionId: iid, name: "John Smith" },
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
  console.log(`✅ Demo teacher: ${teacherUser.username}`);

  // ── 8. Demo warden ─────────────────────────────────────────────────────────
  const hashedWardenPwd = await bcrypt.hash("warden123", 12);
  const wardenUser = await prisma.user.upsert({
    where: { institutionId_username: { institutionId: iid, username: "warden_mary" } },
    update: {},
    create: {
      institutionId: iid,
      username: "warden_mary",
      hashedPassword: hashedWardenPwd,
      role: Role.WARDEN,
      wardenProfile: {
        create: { institutionId: iid, name: "Mary Johnson" },
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
  console.log(`✅ Demo warden: ${wardenUser.username}`);

  // ── 9. Demo student ────────────────────────────────────────────────────────
  const hashedStudentPwd = await bcrypt.hash("student123", 12);
  await prisma.user.upsert({
    where: { institutionId_username: { institutionId: iid, username: "co_cse-2026-001" } },
    update: {},
    create: {
      institutionId: iid,
      username: "co_cse-2026-001",
      hashedPassword: hashedStudentPwd,
      role: Role.STUDENT,
      studentProfile: {
        create: {
          institutionId: iid,
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
  console.log(`✅ Demo student: co_cse-2026-001`);

  console.log("\n🎉 Seeding complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Multi-tenant login credentials:");
  console.log(`  Institution Code: ${DEMO_SLUG}`);
  console.log("  Admin   → username: admin           | password: adminPassword123");
  console.log("  Teacher → username: teacher_john    | password: teacher123");
  console.log("  Warden  → username: warden_mary     | password: warden123");
  console.log("  Student → username: co_cse-2026-001 | password: student123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
