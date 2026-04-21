import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ username: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;
  const supabase = createServiceClient();

  const { data: user } = await supabase
    .from("users")
    .select("id, username, nickname, bio, avatar_url, created_at")
    .eq("username", username.toLowerCase())
    .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Check friendship status with current user
  const { data: friendship } = await supabase
    .from("friendships")
    .select("id, status, requester_id, auto_accept_activities")
    .or(
      `and(requester_id.eq.${session.sub},addressee_id.eq.${user.id}),and(requester_id.eq.${user.id},addressee_id.eq.${session.sub})`
    )
    .maybeSingle();

  return NextResponse.json({
    user,
    friendship: friendship
      ? {
          id: friendship.id,
          status: friendship.status,
          is_requester: friendship.requester_id === session.sub,
          auto_accept_activities: friendship.auto_accept_activities,
        }
      : null,
  });
}
