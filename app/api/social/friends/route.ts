import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";
import { createServiceClient } from "@/lib/supabase/service";

const requestSchema = z.object({ username: z.string().min(1) });

async function fetchUserProfiles(ids: string[]) {
  if (!ids.length) return {} as Record<string, { id: string; username: string; nickname: string }>;
  const admin = createServiceClient();
  const profiles: Record<string, { id: string; username: string; nickname: string }> = {};
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data.user) {
        const meta = data.user.user_metadata ?? {};
        profiles[id] = {
          id,
          username: meta.username ?? "",
          nickname: meta.username ?? meta.nickname ?? "User",
        };
      }
    })
  );
  return profiles;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createClient();

  const [sentRes, receivedRes] = await Promise.all([
    supabase
      .from("friendships")
      .select("id, status, auto_accept_activities, created_at, updated_at, addressee_id")
      .eq("requester_id", session.sub),
    supabase
      .from("friendships")
      .select("id, status, auto_accept_activities, created_at, updated_at, requester_id")
      .eq("addressee_id", session.sub),
  ]);

  const sent     = sentRes.data ?? [];
  const received = receivedRes.data ?? [];

  const friendIds = [
    ...sent.map((f) => f.addressee_id as string),
    ...received.map((f) => f.requester_id as string),
  ].filter(Boolean);

  const profiles = await fetchUserProfiles([...new Set(friendIds)]);

  const friendships = [
    ...sent.map((f) => ({
      ...f,
      friend: profiles[f.addressee_id] ?? { id: f.addressee_id, username: "", nickname: "Unknown" },
      is_requester: true,
    })),
    ...received.map((f) => ({
      ...f,
      friend: profiles[f.requester_id] ?? { id: f.requester_id, username: "", nickname: "Unknown" },
      is_requester: false,
    })),
  ];

  const friends = friendships
    .filter((f) => f.status === "accepted")
    .map((f) => ({ id: f.friend.id, username: f.friend.username || f.friend.nickname }));

  return NextResponse.json({ friendships, friends });
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

  const admin = createServiceClient();
  const targetUsername = result.data.username.trim().toLowerCase();

  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const target = (usersData?.users ?? []).find(
    (u) => (u.user_metadata?.username ?? "").toLowerCase() === targetUsername
  );

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === session.sub) {
    return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });
  }

  const supabase = await createClient();

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

  await admin.from("notifications").insert({
    user_id: target.id,
    type: "friend_request",
    data: { friendship_id: friendship.id },
  });

  return NextResponse.json({ friendship }, { status: 201 });
}
