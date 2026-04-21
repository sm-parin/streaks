import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

const requestSchema = z.object({ username: z.string().min(1) });

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServiceClient();

  const { data: sent } = await supabase
    .from("friendships")
    .select("id, status, auto_accept_activities, created_at, updated_at, addressee:addressee_id(id,username,nickname,avatar_url)")
    .eq("requester_id", session.sub);

  const { data: received } = await supabase
    .from("friendships")
    .select("id, status, auto_accept_activities, created_at, updated_at, requester:requester_id(id,username,nickname,avatar_url)")
    .eq("addressee_id", session.sub);

  const friendships = [
    ...(sent ?? []).map((f) => ({ ...f, friend: f.addressee, is_requester: true })),
    ...(received ?? []).map((f) => ({ ...f, friend: f.requester, is_requester: false })),
  ];

  return NextResponse.json({ friendships });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = requestSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "username required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: target } = await supabase
    .from("users")
    .select("id")
    .eq("username", result.data.username.toLowerCase())
    .single();

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === session.sub) {
    return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(requester_id.eq.${session.sub},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${session.sub})`
    )
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") {
      return NextResponse.json({ error: "Already friends" }, { status: 409 });
    }
    if (existing.status === "pending") {
      return NextResponse.json({ error: "Request already sent" }, { status: 409 });
    }
  }

  const { data: friendship, error } = await supabase
    .from("friendships")
    .insert({ requester_id: session.sub, addressee_id: target.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("notifications").insert({
    user_id: target.id,
    type: "friend_request",
    data: { friendship_id: friendship.id },
  });

  return NextResponse.json({ friendship }, { status: 201 });
}
