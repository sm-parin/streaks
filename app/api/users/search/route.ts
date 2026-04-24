import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ users: [] });

  const supabase = createServiceClient();

  // Partial, case-insensitive match on either username or nickname
  const { data: users, error } = await supabase
    .from("users")
    .select("id, username, nickname, avatar_url")
    .or(`username.ilike.%${q}%,nickname.ilike.%${q}%`)
    .neq("id", session.sub)
    .limit(15);

  if (error || !users?.length) return NextResponse.json({ users: [] });

  // Batch-fetch all friendships between current user and the result set
  const ids = users.map((u) => u.id);
  const { data: friendships } = await supabase
    .from("friendships")
    .select("id, status, requester_id, addressee_id")
    .or(
      `and(requester_id.eq.${session.sub},addressee_id.in.(${ids.join(",")})),` +
      `and(requester_id.in.(${ids.join(",")}),addressee_id.eq.${session.sub})`
    );

  // Build a lookup: other_user_id → friendship summary
  const friendMap = new Map<
    string,
    { id: string; status: string; is_requester: boolean }
  >();
  for (const f of friendships ?? []) {
    const otherId =
      f.requester_id === session.sub ? f.addressee_id : f.requester_id;
    friendMap.set(otherId, {
      id: f.id,
      status: f.status,
      is_requester: f.requester_id === session.sub,
    });
  }

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      friendship: friendMap.get(u.id) ?? null,
    })),
  });
}
