import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { ratelimit } from "@/lib/redis";

const roleRouteMap: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  STUDENT: "/dashboard/student",
  TEACHER: "/dashboard/teacher",
  WARDEN: "/dashboard/warden",
};

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl;

    // Protect forgot-password path from email/SMTP server abuse
    if (pathname.startsWith("/forgot-password")) {
      if (!ratelimit) {
        console.warn("Upstash Redis credentials are not set. Edge rate limiting is disabled.");
        return NextResponse.next();
      }

      const ip = (req as any).ip ?? req.headers.get("x-forwarded-for") ?? "127.0.0.1";
      
      try {
        const { success, limit, reset, remaining } = await ratelimit.limit(ip);

        if (!success) {
          const resetSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));

          if (req.method === "POST" || req.headers.get("accept")?.includes("application/json")) {
            return new NextResponse(
              JSON.stringify({
                success: false,
                message: `Too many requests. Please wait ${resetSeconds} seconds before trying again.`,
              }),
              {
                status: 429,
                headers: {
                  "Content-Type": "application/json",
                  "X-RateLimit-Limit": limit.toString(),
                  "X-RateLimit-Remaining": remaining.toString(),
                  "X-RateLimit-Reset": reset.toString(),
                },
              }
            );
          }

          return new NextResponse(
            `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Too Many Requests - CampusCore</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
                <style>
                  body {
                    font-family: 'Outfit', sans-serif;
                  }
                </style>
              </head>
              <body class="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 min-h-screen flex items-center justify-center p-4">
                <div class="max-w-md w-full rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-8 text-center space-y-6">
                  <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
                    <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  
                  <div class="space-y-2">
                    <h1 class="text-2xl font-bold tracking-tight">Too Many Requests</h1>
                    <p class="text-sm text-zinc-500 dark:text-zinc-400">
                      You have requested password reset codes too many times. To prevent email spam, we rate limit requests.
                    </p>
                  </div>
                  
                  <div class="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 border border-zinc-100 dark:border-zinc-900 flex justify-between items-center text-sm">
                    <span class="font-medium text-zinc-600 dark:text-zinc-400">Time to reset:</span>
                    <span id="countdown" class="font-bold text-zinc-900 dark:text-zinc-50 font-mono">${resetSeconds}s</span>
                  </div>
                  
                  <div>
                    <a href="/login" class="inline-flex items-center justify-center h-11 w-full rounded-xl bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 font-semibold hover:opacity-90 transition-opacity">
                      Return to Login
                    </a>
                  </div>
                </div>
                <script>
                  let time = ${resetSeconds};
                  const interval = setInterval(() => {
                    time = Math.max(0, time - 1);
                    document.getElementById('countdown').innerText = time + 's';
                    if (time <= 0) {
                      clearInterval(interval);
                      window.location.reload();
                    }
                  }, 1000);
                </script>
              </body>
            </html>`,
            {
              status: 429,
              headers: {
                "Content-Type": "text/html",
                "X-RateLimit-Limit": limit.toString(),
                "X-RateLimit-Remaining": remaining.toString(),
                "X-RateLimit-Reset": reset.toString(),
              },
            }
          );
        }
      } catch (err) {
        console.error("Upstash Redis connection failed:", err);
      }
    }

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
        // Allow public pages (login, root, forgot-password)
        if (pathname === "/login" || pathname === "/" || pathname.startsWith("/forgot-password")) return true;
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
  matcher: ["/", "/login", "/dashboard/:path*", "/forgot-password/:path*", "/forgot-password"],
};
