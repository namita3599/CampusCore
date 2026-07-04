import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth/next";

/**
 * Helper to get the server-side session in Server Components and Server Actions.
 * Usage: const session = await auth();
 */
export async function auth() {
  return getServerSession(authOptions);
}
