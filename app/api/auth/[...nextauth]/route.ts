import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║       CampusCore – 3-Field Centralized Multi-Tenant Login                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Login flow (3-field):
 *   1. Resolve Institution: find the `Institution` row by `slug = institutionCode`
 *   2. Resolve User: find the `User` row by `{ institutionId, username }`
 *   3. Verify password with bcrypt
 *   4. Stamp JWT + session with `institutionId` so downstream Server Actions can
 *      call `getTenantPrisma(session.user.institutionId)` for row-level isolation.
 *
 * The bare `prisma` singleton (not the tenant client) is used here intentionally
 * because login is a platform-level operation that must cross tenant boundaries
 * to look up the institution first.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        institutionCode: { label: "Institution Code", type: "text" },
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        // ── Validate all fields are present ────────────────────────────
        if (
          !credentials?.institutionCode ||
          !credentials?.username ||
          !credentials?.password ||
          !credentials?.role
        ) {
          return null;
        }

        // ── Step 1: Resolve the Institution by slug ──────────────────────────
        const slug = credentials.institutionCode
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        const institution = await prisma.institution.findUnique({
          where: { slug },
          select: { id: true, name: true },
        });

        if (!institution) {
          return null;
        }

        // ── Step 2: Resolve the User within that institution with matching role ─
        const user = await prisma.user.findFirst({
          where: {
            institutionId: institution.id,
            username: credentials.username.trim().toLowerCase(),
            role: credentials.role as Role,
          },
          select: {
            id: true,
            username: true,
            hashedPassword: true,
            role: true,
            institutionId: true,
            forcePasswordChange: true,
          },
        });

        if (!user) return null;

        // ── Step 3: Verify the password ──────────────────────────────────────
        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );
        if (!passwordMatch) return null;

        // ── Step 4: Return the user object ───────────────────────────────────
        return {
          id: user.id.toString(),
          username: user.username,
          role: user.role,
          name: user.username,
          // institutionId MUST be present in the JWT for getTenantPrisma()
          institutionId: user.institutionId ?? "",
          forcePasswordChange: user.forcePasswordChange,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.username = (user as any).username;
        // ── Tenant stamp ─────────────────────────────────────────────────────
        token.institutionId = (user as any).institutionId;
        token.forcePasswordChange = (user as any).forcePasswordChange;
        token.exp = Math.floor(Date.now() / 1000) + 86400; // 24h
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.username = token.username as string;
        // ── Tenant stamp ─────────────────────────────────────────────────────
        session.user.institutionId = token.institutionId as string;
        session.user.forcePasswordChange = token.forcePasswordChange as boolean;
        if (token.exp) {
          session.expires = new Date(
            (token.exp as number) * 1000
          ).toISOString();
        }
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 86400, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
