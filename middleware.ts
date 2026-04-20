import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Route middleware -- runs on every request matching the config.matcher pattern.
 *
 * Responsibilities:
 * 1. Refresh the Supabase auth session cookie on each request.
 * 2. Redirect unauthenticated users away from protected routes -> /login.
 * 3. Redirect authenticated users away from auth routes -> /today.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  /**
   * getUser() makes a network call to Supabase to validate the JWT.
   * This is intentional -- it prevents spoofed tokens from bypassing auth.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/today") ||
    pathname.startsWith("/configure");

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  /** Unauthenticated -> redirect to login */
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  /** Already authenticated -> skip auth pages */
  if (isAuthPage && user) {
    const todayUrl = new URL("/today", request.url);
    return NextResponse.redirect(todayUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /**
     * Match all paths except:
     * - Next.js internals (_next/static, _next/image)
     * - Static files (favicon, manifest, icons, service worker)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-.*).*)",
  ],
};
