import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // DIRECT_URL bypasses pgBouncer for Prisma CLI commands (db push / migrate)
    // If you only have one URL, set both DATABASE_URL and DIRECT_URL to the same value
    url: env("DIRECT_URL"),
  },
});
