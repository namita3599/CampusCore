/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║              CampusCore – Tenant-Scoped Prisma Client                        ║
 * ║                       lib/prisma-tenant.ts                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Usage
 * ─────
 *   // In a Server Action or Route Handler, after resolving institutionId from session:
 *   const db = getTenantPrisma(session.user.institutionId);
 *   const students = await db.studentProfile.findMany(); // automatically filtered
 *   const newUser  = await db.user.create({ data: { username: "john" } }); // institutionId injected
 *
 * How it works
 * ────────────
 *   Prisma Client Extensions intercept `$allOperations`.  For every query on a
 *   tenant-aware model we transparently:
 *     • Read  ops  (findMany / findFirst / findUnique / count / aggregate …)
 *         → inject `{ institutionId }` into the `where` clause.
 *     • Write ops  (create / update / upsert)
 *         → inject `{ institutionId }` into the `data` payload so the row is
 *            always stamped with the correct tenant.
 *
 *   Models that are not tenant-aware (e.g. junction tables like StudentSubject,
 *   AnnouncementRead) are passed through unchanged — they inherit tenant isolation
 *   via their parent FK relations.
 *
 * Security guarantee
 * ──────────────────
 *   Because the extension operates at the query engine level, application code
 *   CANNOT accidentally leak cross-tenant data as long as it always uses
 *   `getTenantPrisma(institutionId)` instead of the bare `prisma` singleton.
 *   The bare `prisma` export in lib/prisma.ts should only be used for:
 *     - Institution lookup (slug → id) during login
 *     - The registerInstitution genesis transaction
 *     - Super-admin / platform-level operations
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Models that carry an `institutionId` column and must be tenant-scoped.
// Keep this list in sync with any new models added to schema.prisma.
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

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a Prisma Client extended with row-level tenant isolation.
 *
 * @param institutionId  The CUID of the current tenant's Institution row.
 *                       Source of truth: `session.user.institutionId`.
 */
export function getTenantPrisma(institutionId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Normalise model name to camelCase (Prisma passes PascalCase)
          const modelKey = model
            ? model.charAt(0).toLowerCase() + model.slice(1)
            : "";

          // Pass through non-tenant-aware models untouched
          if (!TENANT_AWARE_MODELS.has(modelKey as any)) {
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
              // createMany uses `data: [...]`
              if (Array.isArray(mutatedArgs.data)) {
                mutatedArgs.data = mutatedArgs.data.map(
                  (row: Record<string, unknown>) => ({
                    ...row,
                    institutionId,
                  })
                );
              }
            } else {
              // create uses `data: {...}`
              mutatedArgs.data = {
                ...(mutatedArgs.data ?? {}),
                institutionId,
              };
            }
          }

          if (READWRITE_OPS.has(operation)) {
            if (operation === "upsert") {
              // upsert has `create` and `update` sub-payloads
              mutatedArgs.create = {
                ...(mutatedArgs.create ?? {}),
                institutionId,
              };
              mutatedArgs.update = {
                ...(mutatedArgs.update ?? {}),
                // Don't overwrite institutionId on update — it should never change
              };
            } else {
              // update / updateMany: inject into `data`
              mutatedArgs.data = {
                ...(mutatedArgs.data ?? {}),
                // institutionId is immutable — do NOT inject here to prevent
                // accidental tenant reassignment. The WHERE clause already scopes it.
              };
            }
          }

          return query(mutatedArgs);
        },
      },
    },
  });
}

/** Convenience type: the return type of getTenantPrisma */
export type TenantPrismaClient = ReturnType<typeof getTenantPrisma>;
