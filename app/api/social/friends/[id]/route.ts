import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

const actionSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

const settingsSchema = z.object({
  auto_accept_activities: z.boolean(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const settingsResult = settingsSchema.safeParse(body);
  if (settingsResult.success) {
    const { data, error } = await supabase
      .from("friendships")
      .update({ auto_accept_activities: settingsResult.data.auto_accept_activities })
      .eq("id", id)
      .or(`requester_id.eq.${session.sub},addressee_id.eq.${session.sub}`)
      .select()
      .single();
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ friendship: data });
  }

  const actionResult = actionSchema.safeParse(body);
  if (!actionResult.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const newStatus = actionResult.data.action === "accept" ? "accepted" : "rejected";
  const { data: friendship, error } = await supabase
    .from("friendships")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("addressee_id", session.sub)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !friendship) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (actionResult.data.action === "accept") {
    await supabase.from("notifications").insert({
      user_id: friendship.requester_id,
      type: "friend_accepted",
      data: { friendship_id: friendship.id },
    });
  }

  return NextResponse.json({ friendship });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();
  await supabase
    .from("friendships")
    .delete()
    .eq("id", id)
    .or(`requester_id.eq.${session.sub},addressee_id.eq.${session.sub}`);
  return NextResponse.json({ success: true });
}
