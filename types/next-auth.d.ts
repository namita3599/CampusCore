import { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
      /** CUID of the tenant's Institution row.  Always present after login.
       *  Pass this to `getTenantPrisma(institutionId)` for row-level isolation. */
      institutionId: string;
      /** If true, redirect the user to change-password before anything else. */
      forcePasswordChange: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    username: string;
    role: Role;
    institutionId: string;
    forcePasswordChange: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: Role;
    institutionId: string;
    forcePasswordChange: boolean;
  }
}
