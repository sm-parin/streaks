import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: session.sub, endpoint, keys_p256dh: keys.p256dh, keys_auth: keys.auth },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    console.error("push_subscriptions upsert error:", error.message);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
