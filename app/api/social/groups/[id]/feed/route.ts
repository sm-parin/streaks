import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: myMembership } = await supabase
    .from("group_members").select("user_id").eq("group_id", id)
    .eq("user_id", session.sub).eq("status", "active").maybeSingle();
  if (!myMembership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { data: memberRows } = await supabase
    .from("group_members").select("user_id, role").eq("group_id", id).eq("status", "active");
  const memberIds = (memberRows ?? []).map((m) => m.user_id as string);

  const { data: profiles } = await supabase
    .from("profiles").select("id, username, avatar_url").in("id", memberIds);
  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id as string, p as { id: string; username: string; avatar_url: string | null }])
  );

  const todayDOW = new Date().getDay();
  const today = new Date().toISOString().split("T")[0];
  const { data: groupTasks } = await supabase
    .from("tasks").select("id, title, user_id, active_days").eq("group_id", id).eq("is_recurring", true);
  const taskIds = (groupTasks ?? []).map((t) => t.id as string);

  let todayCompletions: Array<{ task_id: string; user_id: string }> = [];
  if (taskIds.length) {
    const { data: comps } = await supabase.from("task_completions").select("task_id, user_id")
      .in("task_id", taskIds).eq("completed_date", today);
    todayCompletions = (comps ?? []) as typeof todayCompletions;
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  let recentCompletions: Array<{ task_id: string; user_id: string; completed_date: string }> = [];
  if (taskIds.length) {
    const { data: rc } = await supabase.from("task_completions")
      .select("task_id, user_id, completed_date").in("task_id", taskIds)
      .gte("completed_date", cutoff).order("completed_date", { ascending: false });
    recentCompletions = (rc ?? []) as typeof recentCompletions;
  }

  const memberActivity = memberIds.map((uid) => {
    const profile = profileMap[uid];
    const completedTaskIds = todayCompletions.filter((c) => c.user_id === uid).map((c) => c.task_id);
    const totalHabits = (groupTasks ?? []).filter(
      (t) => Array.isArray(t.active_days) && (t.active_days as number[]).includes(todayDOW)
    ).length;
    const memberDates = new Set(recentCompletions.filter((c) => c.user_id === uid).map((c) => c.completed_date));
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 30; i++) {
      if (memberDates.has(d.toISOString().split("T")[0])) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return { user_id: uid, username: profile?.username ?? "Unknown", avatar_url: profile?.avatar_url ?? null, completedTaskIds, currentStreak: streak, totalHabits };
  }).sort((a, b) => b.completedTaskIds.length - a.completedTaskIds.length);

  return NextResponse.json({ habits: groupTasks ?? [], memberActivity });
}
