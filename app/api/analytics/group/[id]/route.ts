import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: myMembership } = await supabase.from("group_members").select("user_id")
    .eq("group_id", id).eq("user_id", session.sub).eq("status", "active").maybeSingle();
  if (!myMembership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { data: memberRows } = await supabase.from("group_members").select("user_id").eq("group_id", id).eq("status", "active");
  const memberIds = (memberRows ?? []).map((m) => m.user_id as string);

  const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", memberIds);
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id as string, p.username as string]));

  const { data: groupTasks } = await supabase.from("tasks").select("id, title, user_id, active_days").eq("group_id", id).eq("is_recurring", true);
  const groupTaskIds = (groupTasks ?? []).map((t) => t.id as string);

  const now = new Date();
  const dow = now.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const weekStart = new Date(now); weekStart.setDate(now.getDate() + diffToMon); weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekEndStr = now.toISOString().split("T")[0];

  let weekCompletions: Array<{ task_id: string; user_id: string; completed_date: string }> = [];
  if (groupTaskIds.length) {
    const { data: comps } = await supabase.from("task_completions").select("task_id, user_id, completed_date")
      .in("task_id", groupTaskIds).gte("completed_date", weekStartStr).lte("completed_date", weekEndStr);
    weekCompletions = (comps ?? []) as typeof weekCompletions;
  }

  const memberMatrix = memberIds.map((uid) => ({
    user_id: uid, username: profileMap[uid] ?? "Unknown",
    habitCompletions: (groupTasks ?? []).map((task) => ({
      task_id: task.id as string, task_title: task.title as string,
      completedDates: weekCompletions.filter((c) => c.user_id === uid && c.task_id === task.id).map((c) => c.completed_date),
    })),
  }));

  const standingsRaw = await Promise.all(memberIds.map(async (uid) => {
    try {
      const { data, error } = await supabase.functions.invoke("streak-calc", { body: { user_id: uid } });
      if (error || !Array.isArray(data)) return { user_id: uid, currentStreak: 0 };
      const maxStreak = Math.max(0, ...(data as Array<{ currentStreak: number }>).map((s) => s.currentStreak));
      return { user_id: uid, currentStreak: maxStreak };
    } catch { return { user_id: uid, currentStreak: 0 }; }
  }));
  const standings = standingsRaw.sort((a, b) => b.currentStreak - a.currentStreak)
    .map((s, idx) => ({ rank: idx + 1, user_id: s.user_id, username: profileMap[s.user_id] ?? "Unknown", currentStreak: s.currentStreak }));

  let groupRecord: { username: string; longestStreak: number; task_title: string } | null = null;
  if (groupTaskIds.length) {
    const { data: allComps } = await supabase.from("task_completions").select("task_id, user_id, completed_date")
      .in("task_id", groupTaskIds).order("completed_date", { ascending: true });
    const allGroupComps = (allComps ?? []) as Array<{ task_id: string; user_id: string; completed_date: string }>;
    let bestStreak = 0, bestUserId = "", bestTaskId = "";
    for (const uid of memberIds) {
      for (const task of groupTasks ?? []) {
        const dates = allGroupComps.filter((c) => c.user_id === uid && c.task_id === task.id).map((c) => c.completed_date).sort();
        if (!dates.length) continue;
        let cur = 1, max = 1;
        for (let i = 1; i < dates.length; i++) {
          const diff = (new Date(dates[i]).getTime() - new Date(dates[i-1]).getTime()) / 86400000;
          if (diff === 1) { cur++; max = Math.max(max, cur); } else cur = 1;
        }
        if (max > bestStreak) { bestStreak = max; bestUserId = uid; bestTaskId = task.id as string; }
      }
    }
    if (bestStreak > 0) {
      const bestTask = (groupTasks ?? []).find((t) => t.id === bestTaskId);
      groupRecord = { username: profileMap[bestUserId] ?? "Unknown", longestStreak: bestStreak, task_title: (bestTask?.title as string) ?? "Unknown habit" };
    }
  }

  return NextResponse.json({ memberMatrix, standings, groupRecord });
}
