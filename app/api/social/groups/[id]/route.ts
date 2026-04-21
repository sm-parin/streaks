import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(300).nullable().optional(),
});

const inviteSchema = z.object({ username: z.string().min(1) });

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: group } = await supabase.from("groups").select("*").eq("id", id).single();
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: members } = await supabase
    .from("group_members")
    .select("*, user:user_id(id,username,nickname,avatar_url)")
    .eq("group_id", id)
    .neq("status", "removed");

  const myMembership = members?.find((m) => m.user_id === session.sub);
  if (!myMembership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  return NextResponse.json({
    group: { ...group, my_role: myMembership.role, my_status: myMembership.status },
    members,
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const inviteResult = inviteSchema.safeParse(body);
  if (inviteResult.success && "username" in (body as object)) {
    const supabase = createServiceClient();

    const { data: me } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", id)
      .eq("user_id", session.sub)
      .eq("status", "active")
      .single();
    if (!me || me.role !== "admin") {
      return NextResponse.json({ error: "Only admins can invite" }, { status: 403 });
    }

    const { data: target } = await supabase
      .from("users")
      .select("id")
      .eq("username", inviteResult.data.username.toLowerCase())
      .single();
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { data: group } = await supabase.from("groups").select("name").eq("id", id).single();

    await supabase.from("group_members").upsert(
      { group_id: id, user_id: target.id, role: "member", status: "pending" },
      { onConflict: "group_id,user_id" }
    );

    await supabase.from("notifications").insert({
      user_id: target.id,
      type: "group_invite",
      data: { group_id: id, group_name: group?.name },
    });

    return NextResponse.json({ success: true });
  }

  const updateResult = updateSchema.safeParse(body);
  if (!updateResult.success) {
    return NextResponse.json({ error: updateResult.error.errors[0].message }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: group, error } = await supabase
    .from("groups")
    .update({ ...updateResult.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("created_by", session.sub)
    .select()
    .single();

  if (error || !group) return NextResponse.json({ error: "Not found or not admin" }, { status: 404 });
  return NextResponse.json({ group });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();

  const { searchParams } = new URL(_req.url);
  const action = searchParams.get("action");

  if (action === "leave") {
    await supabase
      .from("group_members")
      .update({ status: "removed" })
      .eq("group_id", id)
      .eq("user_id", session.sub);
    return NextResponse.json({ success: true });
  }

  if (action === "accept" || action === "reject") {
    const newStatus = action === "accept" ? "active" : "removed";
    await supabase
      .from("group_members")
      .update({ status: newStatus, joined_at: action === "accept" ? new Date().toISOString() : null })
      .eq("group_id", id)
      .eq("user_id", session.sub)
      .eq("status", "pending");
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", id)
    .eq("created_by", session.sub);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
