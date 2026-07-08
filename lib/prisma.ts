import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const client = globalForPrisma.prisma ?? createPrismaClient();

// Self-healing check: if the schema changed but the dev server is using a cached instance
// that doesn't have the new systemSettings model yet, force recreate it.
export const prisma = (() => {
  if (client && !("systemSettings" in client)) {
    return createPrismaClient();
  }
  return client;
})();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
