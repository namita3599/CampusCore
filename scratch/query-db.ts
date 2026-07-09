import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking database tables for ID = 6...");

  const tables = [
    "user",
    "studentProfile",
    "teacherProfile",
    "wardenProfile",
    "subject",
    "hostel",
    "room",
    "complaint",
  ];

  for (const table of tables) {
    try {
      const records = await (prisma as any)[table].findMany();
      console.log(`Table ${table} total records: ${records.length}`);
      const matches = records.filter((r: any) => r.id === 6 || r.id === "6");
      if (matches.length > 0) {
        console.log(`Table ${table} has matching records with ID 6:`, JSON.stringify(matches, null, 2));
      }
    } catch (err: any) {
      console.error(`Failed on table ${table}:`, err.message);
    }
  }
}

main().catch(console.error);
