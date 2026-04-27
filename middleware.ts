import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/today") ||
    pathname.startsWith("/streaks") ||
    pathname.startsWith("/habits") ||
    pathname.startsWith("/habits") ||
    pathname.startsWith("/social") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/onboarding/");

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password");

  // Gate 1: Auth
  if (isProtected && !user) return NextResponse.redirect(new URL("/login", request.url));
  if (isAuthPage && user) return NextResponse.redirect(new URL("/today", request.url));

  // Gates 2 & 3: Username + Onboarding (authenticated users only)
  if (user) {
    const username = (user.user_metadata?.username as string | undefined)?.trim();
    const onboardingComplete = user.user_metadata?.onboarding_complete === true;

    if (!username) {
      if (pathname !== "/onboarding/username") return NextResponse.redirect(new URL("/onboarding/username", request.url));
    } else if (pathname === "/onboarding/username") {
      return NextResponse.redirect(new URL(onboardingComplete ? "/today" : "/onboarding/welcome", request.url));
    } else {
      if (!onboardingComplete && !pathname.startsWith("/onboarding/")) return NextResponse.redirect(new URL("/onboarding/welcome", request.url));
      if (onboardingComplete && pathname === "/onboarding/welcome") return NextResponse.redirect(new URL("/today", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-|api/).*)"],
};

