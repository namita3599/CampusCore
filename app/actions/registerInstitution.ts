"use server";

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          CampusCore – Institution Registration (The Genesis Flow)            ║
 * ║                   app/actions/registerInstitution.ts                         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * This Server Action is called from the public landing page when a new college
 * signs up for CampusCore.  It atomically creates:
 *   1. An `Institution` row (the tenant record)
 *   2. The first `User` row for that institution with role ADMIN
 *
 * An Interactive Transaction (`prisma.$transaction`) guarantees that either
 * both rows are created together or neither is — preventing orphaned institutions
 * with no admin or orphaned admins with no institution.
 *
 * Usage (from a Client Component or Server Component form handler):
 *   const result = await registerInstitution({
 *     institutionName: "MIT College of Engineering",
 *     desiredCode: "MIT2024",
 *     adminUsername: "principal",
 *     adminPassword: "SecurePass123!",
 *   });
 */

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Input / Output types
// ─────────────────────────────────────────────────────────────────────────────

export interface RegisterInstitutionInput {
  /** Human-readable college name, e.g. "MIT College of Engineering" */
  institutionName: string;
  /** Desired institution code — will be sanitized to lowercase alphanumeric.
   *  This becomes the `slug` and the "Institution Code" users type at login. */
  desiredCode: string;
  /** Username for the initial ADMIN account */
  adminUsername: string;
  /** Plain-text password — hashed with bcrypt before storage */
  adminPassword: string;
}

export type RegisterInstitutionResult =
  | { success: true; institutionId: string; slug: string }
  | { success: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Strips all non-alphanumeric characters and lowercases the result. */
function sanitizeSlug(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const MIN_PASSWORD_LENGTH = 8;

// ─────────────────────────────────────────────────────────────────────────────
// Server Action
// ─────────────────────────────────────────────────────────────────────────────

export async function registerInstitution(
  input: RegisterInstitutionInput
): Promise<RegisterInstitutionResult> {
  // ── 1. Validate inputs ─────────────────────────────────────────────────────
  const { institutionName, desiredCode, adminUsername, adminPassword } = input;

  if (!institutionName?.trim()) {
    return { success: false, error: "Institution name is required." };
  }
  if (!desiredCode?.trim()) {
    return { success: false, error: "Institution code is required." };
  }
  if (!adminUsername?.trim()) {
    return { success: false, error: "Admin username is required." };
  }
  if (!adminPassword || adminPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  // ── 2. Sanitize the slug ───────────────────────────────────────────────────
  const slug = sanitizeSlug(desiredCode);

  if (slug.length < 3) {
    return {
      success: false,
      error:
        "Institution code must contain at least 3 alphanumeric characters after sanitization.",
    };
  }

  // ── 3. Check if slug is already taken ─────────────────────────────────────
  const existing = await prisma.institution.findUnique({ where: { slug } });
  if (existing) {
    return {
      success: false,
      error: `Institution code "${slug}" is already taken. Please choose a different code.`,
    };
  }

  // ── 4. Hash the admin password ────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  // ── 5. Atomic transaction: create Institution + Admin User ────────────────
  try {
    const { institution } = await prisma.$transaction(async (tx) => {
      // 5a. Create the Institution (tenant) row
      const institution = await tx.institution.create({
        data: {
          name: institutionName.trim(),
          slug,
        },
      });

      // 5b. Create the first ADMIN user for this institution.
      //     forcePasswordChange: false because the admin chose their own password
      //     at sign-up; they don't need to immediately reset it.
      await tx.user.create({
        data: {
          institutionId: institution.id,
          username: adminUsername.trim().toLowerCase(),
          hashedPassword,
          role: "ADMIN",
          forcePasswordChange: false,
        },
      });

      return { institution };
    });

    return {
      success: true,
      institutionId: institution.id,
      slug: institution.slug,
    };
  } catch (err: unknown) {
    console.error("[registerInstitution] Transaction failed:", err);

    // Catch Prisma unique constraint violation (race condition on slug)
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint failed")
    ) {
      return {
        success: false,
        error:
          "Institution code was claimed by another registration at the same time. Please try again.",
      };
    }

    return {
      success: false,
      error: "An unexpected error occurred during registration. Please retry.",
    };
  }
}
