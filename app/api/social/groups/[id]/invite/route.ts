import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };
const inviteSchema = z.object({ user_id: z.string().uuid() });

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const { user_id: targetUserId } = parsed.data;
  const supabase = createServiceClient();
  const { data: myMembership } = await supabase.from("group_members").select("role")
    .eq("group_id", id).eq("user_id", session.sub).eq("status", "active").maybeSingle();
  if (!myMembership || !["owner", "admin"].includes(myMembership.role as string))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data: friendship } = await supabase.from("friendships").select("id")
    .or(`and(requester_id.eq.${session.sub},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${session.sub})`)
    .eq("status", "accepted").maybeSingle();
  if (!friendship) return NextResponse.json({ error: "Not a friend" }, { status: 403 });
  const [{ data: group }, { data: inviterProfile }] = await Promise.all([
    supabase.from("groups").select("name").eq("id", id).single(),
    supabase.from("profiles").select("username").eq("id", session.sub).maybeSingle(),
  ]);
  await supabase.from("group_members").upsert(
    { group_id: id, user_id: targetUserId, role: "member", status: "pending" },
    { onConflict: "group_id,user_id" }
  );
  await supabase.from("notifications").insert({
    user_id: targetUserId, type: "group_invite",
    payload: { group_id: id, group_name: group?.name ?? "", invited_by: inviterProfile?.username ?? session.sub },
  });
  return NextResponse.json({ success: true }, { status: 201 });
}
