import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const sh = await prisma.studentHostel.findMany({
    include: { student: true, hostel: true }
  });
  console.log("StudentHostel records:", JSON.stringify(sh, null, 2));
}

main().catch(console.error);
