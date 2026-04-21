import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/session";

/**
 * Route middleware â€” runs on every request matching the config.matcher pattern.
 *
 * Reads the custom JWT session cookie and:
 * 1. Redirects unauthenticated users away from protected routes â†’ /login
 * 2. Redirects authenticated users away from auth routes â†’ /today
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/today") ||
    pathname.startsWith("/streaks") ||
    pathname.startsWith("/records") ||
    pathname.startsWith("/social") ||
    pathname.startsWith("/settings") ||
    // Legacy protected routes
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/configure");

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password");

  const token = request.cookies.get(COOKIE_NAME)?.value ?? null;
  const session = token ? await verifyToken(token) : null;
  const isAuthenticated = session?.type === "session";

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isAuthenticated) {
    const todayUrl = new URL("/today", request.url);
    return NextResponse.redirect(todayUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-|api/).*)",
  ],
};
