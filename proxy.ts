import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const roleRouteMap: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  STUDENT: "/dashboard/student",
  TEACHER: "/dashboard/teacher",
  WARDEN: "/dashboard/warden",
};

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const role = token?.role as string | undefined;

    // Redirect authenticated users away from login/root
    if ((pathname === "/" || pathname === "/login") && role) {
      return NextResponse.redirect(new URL(roleRouteMap[role] ?? "/login", req.url));
    }

    // Enforce role-based access for dashboard routes
    if (pathname.startsWith("/dashboard") && role) {
      const allowedPrefix = roleRouteMap[role];
      if (!pathname.startsWith(allowedPrefix)) {
        return NextResponse.redirect(new URL(allowedPrefix, req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;
        // Allow public pages (login, root)
        if (pathname === "/login" || pathname === "/") return true;
        // All dashboard routes require a token
        if (pathname.startsWith("/dashboard")) return !!token;
        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"],
};
