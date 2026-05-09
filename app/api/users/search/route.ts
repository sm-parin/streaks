import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

type ProfileRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  last_active_at: string | null;
  created_at: string | null;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ users: [] });

  const supabase = createServiceClient();

  // Query A: partial username match (case-insensitive)
  // Query B: exact email match — only attempted when query contains "@"
  const [usernameRes, emailRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, avatar_url, last_active_at, created_at")
      .ilike("username", `%${q}%`)
      .neq("id", session.sub)
      .limit(10),

    q.includes("@")
      ? supabase
          .from("profiles")
          .select("id, username, avatar_url, last_active_at, created_at")
          .eq("email", q.toLowerCase())
          .neq("id", session.sub)
          .limit(1)
      : Promise.resolve({ data: [] as ProfileRow[], error: null }),
  ]);

  // Merge and deduplicate by id (username results first, email result appended if new)
  const seen = new Set<string>();
  const merged: ProfileRow[] = [];
  for (const u of [...(usernameRes.data ?? []), ...((emailRes as { data: ProfileRow[] | null }).data ?? [])]) {
    if (!seen.has(u.id)) {
      seen.add(u.id);
      merged.push(u as ProfileRow);
    }
  }

  if (!merged.length) return NextResponse.json({ users: [] });

  const ids = merged.map((u) => u.id);

  // Activity ranking: recency (60%) + completions in last 30 days (40%)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const [completionRes, friendshipRes] = await Promise.all([
    supabase
      .from("task_completions")
      .select("user_id")
      .in("user_id", ids)
      .gte("completed_date", thirtyDaysAgoStr),

    supabase
      .from("friendships")
      .select("id, status, requester_id, addressee_id")
      .or(
        `and(requester_id.eq.${session.sub},addressee_id.in.(${ids.join(",")})),` +
        `and(requester_id.in.(${ids.join(",")}),addressee_id.eq.${session.sub})`
      ),
  ]);

  // Count completions per user over last 30 days
  const completionCount = new Map<string, number>();
  for (const row of completionRes.data ?? []) {
    completionCount.set(row.user_id, (completionCount.get(row.user_id) ?? 0) + 1);
  }

  // Build friendship lookup: other_user_id → summary
  const friendMap = new Map<string, { id: string; status: string; is_requester: boolean }>();
  for (const f of friendshipRes.data ?? []) {
    const otherId = f.requester_id === session.sub ? f.addressee_id : f.requester_id;
    friendMap.set(otherId, { id: f.id, status: f.status, is_requester: f.requester_id === session.sub });
  }

  // Compute activity_score = recency (60%) + completion_rate (40%), sort descending
  const now = Date.now();
  const scored = merged
    .map((u) => {
      const daysSinceActive = u.last_active_at
        ? (now - new Date(u.last_active_at).getTime()) / 86_400_000
        : 365;
      const recencyScore = (1 / (1 + daysSinceActive)) * 0.6;
      const completionScore = Math.min((completionCount.get(u.id) ?? 0) / 30, 1) * 0.4;
      return {
        id: u.id,
        username: u.username,
        avatar_url: u.avatar_url,
        created_at: u.created_at,
        activity_score: recencyScore + completionScore,
        friendship: friendMap.get(u.id) ?? null,
      };
    })
    .sort((a, b) => b.activity_score - a.activity_score);

  return NextResponse.json({ users: scored });
}

