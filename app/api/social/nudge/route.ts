import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

const nudgeSchema = z.object({ target_user_id: z.string().uuid(), message: z.string().max(200).optional() });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const parsed = nudgeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const { target_user_id, message } = parsed.data;
  if (target_user_id === session.sub) return NextResponse.json({ error: "Cannot nudge yourself" }, { status: 400 });
  const supabase = createServiceClient();
  const { data: friendship } = await supabase.from("friendships").select("id")
    .or(`and(requester_id.eq.${session.sub},addressee_id.eq.${target_user_id}),and(requester_id.eq.${target_user_id},addressee_id.eq.${session.sub})`)
    .eq("status", "accepted").maybeSingle();
  if (!friendship) {
    const { data: myGroups } = await supabase.from("group_members").select("group_id").eq("user_id", session.sub).eq("status", "active");
    const myGroupIds = (myGroups ?? []).map((g) => g.group_id as string);
    if (myGroupIds.length > 0) {
      const { data: sharedGroup } = await supabase.from("group_members").select("group_id")
        .eq("user_id", target_user_id).eq("status", "active").in("group_id", myGroupIds).maybeSingle();
      if (!sharedGroup) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  }
  const { data: senderProfile } = await supabase.from("profiles").select("username").eq("id", session.sub).maybeSingle();
  await supabase.from("notifications").insert({
    user_id: target_user_id, type: "nudge",
    payload: { from_user_id: session.sub, from_username: senderProfile?.username ?? "Someone", message: message ?? null },
  });
  return NextResponse.json({ success: true });
}
