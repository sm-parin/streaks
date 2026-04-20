import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback handler.
 *
 * Supabase redirects here after a successful Google (or other provider)
 * sign-in. Exchanges the one-time `code` parameter for a session and then
 * redirects the user to the app.
 *
 * Route: GET /auth/callback?code=<code>&next=<path>
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  /** Optional redirect target; defaults to /today */
  const next = searchParams.get("next") ?? "/today";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      /** Ensure we only redirect to paths on the same origin */
      const redirectPath = next.startsWith("/") ? next : "/today";
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  /** Something went wrong ΓÇô send the user to login with an error hint */
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
