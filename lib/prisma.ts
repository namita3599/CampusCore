import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ─────────────────────────────────────────────────────────────────────────────
// Models that carry an `institutionId` column and must be tenant-scoped.
// ─────────────────────────────────────────────────────────────────────────────
const TENANT_AWARE_MODELS = new Set([
  "user",
  "studentProfile",
  "teacherProfile",
  "wardenProfile",
  "room",
  "hostel",
  "subject",
  "announcement",
  "complaint",
  "systemSettings",
  "feeRecord",
  "invoice",
  "transaction",
  "attendanceRecord",
] as const);

// READ operations that should have `institutionId` injected into `where`
const READ_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

// WRITE operations that should have `institutionId` injected into `data`
const WRITE_DATA_OPS = new Set(["create", "createMany"]);

// Operations that need injection into both `where` AND `data`
const READWRITE_OPS = new Set(["update", "updateMany", "upsert"]);

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }

  const adapter = new PrismaPg({ connectionString });

  const rawClient = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Extend client with automatic request-based tenant isolation
  return rawClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Normalise model name to camelCase
          const modelKey = model
            ? model.charAt(0).toLowerCase() + model.slice(1)
            : "";

          // Pass through non-tenant-aware models untouched
          if (!TENANT_AWARE_MODELS.has(modelKey as any)) {
            return query(args);
          }

          let institutionId: string | null = null;

          // ── Layer 1: Read custom header injected by Next.js middleware ──────
          try {
            const { headers } = await import("next/headers");
            const headersList = await headers();
            institutionId = headersList.get("x-tenant-id");
          } catch {
            // Not in Next.js request context (e.g. CLI, seed script, build time)
          }

          // ── Layer 2: Fallback to session (guarding against infinite loops) ──
          if (!institutionId && modelKey !== "user" && modelKey !== "institution") {
            try {
              const { getServerSession } = await import("next-auth/next");
              const { authOptions } = await import("@/app/api/auth/[...nextauth]/route");
              const session = await getServerSession(authOptions);
              if (session?.user?.institutionId) {
                institutionId = session.user.institutionId;
              }
            } catch {
              // Ignore session lookup errors outside request context
            }
          }

          // If no institutionId resolved, run unfiltered (platform-level/genesis operations)
          if (!institutionId) {
            return query(args);
          }

          const mutatedArgs = { ...args } as Record<string, any>;

          // ── Inject into WHERE clause (read & readwrite ops) ────────────────
          if (READ_OPS.has(operation) || READWRITE_OPS.has(operation)) {
            mutatedArgs.where = {
              ...(mutatedArgs.where ?? {}),
              institutionId,
            };
          }

          // ── Inject into DATA payload (write & readwrite ops) ──────────────
          if (WRITE_DATA_OPS.has(operation)) {
            if (operation === "createMany") {
              if (Array.isArray(mutatedArgs.data)) {
                mutatedArgs.data = mutatedArgs.data.map(
                  (row: Record<string, unknown>) => ({
                    ...row,
                    institutionId,
                  })
                );
              }
            } else {
              mutatedArgs.data = {
                ...(mutatedArgs.data ?? {}),
                institutionId,
              };
            }
          }

          if (READWRITE_OPS.has(operation)) {
            if (operation === "upsert") {
              mutatedArgs.create = {
                ...(mutatedArgs.create ?? {}),
                institutionId,
              };
              mutatedArgs.update = {
                ...(mutatedArgs.update ?? {}),
              };
            } else {
              mutatedArgs.data = {
                ...(mutatedArgs.data ?? {}),
              };
            }
          }

          return query(mutatedArgs);
        },
      },
    },
  });
}

export const prisma = createPrismaClient();
export type TenantPrismaClient = typeof prisma;
