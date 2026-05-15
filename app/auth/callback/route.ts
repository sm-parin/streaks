import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const ref  = searchParams.get("ref") ?? "";
  const next = searchParams.get("next") ?? "/goals";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (ref && data.user) {
        try {
          const service = createServiceClient();
          const { data: referrer } = await service
            .from("profiles")
            .select("id")
            .eq("username", ref.toLowerCase())
            .maybeSingle();
          if (referrer && referrer.id !== data.user.id) {
            await service.from("friendships").insert({
              requester_id: data.user.id,
              addressee_id: referrer.id,
            });
          }
        } catch {
          // Non-fatal — do not block sign-in
        }
      }
      const redirectPath = next.startsWith("/") ? next : "/goals";
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
