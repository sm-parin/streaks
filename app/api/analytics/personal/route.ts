import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  function daysAgo(n: number): Date { const d = new Date(today); d.setDate(d.getDate() - n); return d; }
  function dateStr(d: Date): string { return d.toISOString().split("T")[0]; }

  const since365 = dateStr(daysAgo(364));
  const { data: completions } = await supabase.from("task_completions")
    .select("task_id, completed_date, is_grace").eq("user_id", session.sub)
    .gte("completed_date", since365).lte("completed_date", todayStr);

  const { data: tasks } = await supabase.from("tasks").select("id, active_days")
    .eq("user_id", session.sub).eq("is_recurring", true).neq("status", "rejected");

  const allTasks = (tasks ?? []) as Array<{ id: string; active_days: number[] }>;
  const allCompletions = completions ?? [];

  function scheduledOnDate(d: Date): number {
    const dow = d.getDay();
    return allTasks.filter((t) => Array.isArray(t.active_days) && t.active_days.includes(dow)).length;
  }

  const completionsByDate: Record<string, number> = {};
  for (const c of allCompletions) {
    if (!c.is_grace) completionsByDate[c.completed_date] = (completionsByDate[c.completed_date] ?? 0) + 1;
  }

  const heatmapData: { date: string; count: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = daysAgo(i); const ds = dateStr(d);
    heatmapData.push({ date: ds, count: completionsByDate[ds] ?? 0 });
  }

  let s7 = 0, t7 = 0, s30 = 0, t30 = 0;
  for (let i = 0; i < 30; i++) {
    const d = daysAgo(i); const ds = dateStr(d); const sched = scheduledOnDate(d); const done = completionsByDate[ds] ?? 0;
    if (i < 7) { s7 += Math.min(done, sched); t7 += sched; }
    s30 += Math.min(done, sched); t30 += sched;
  }
  const last7Rate = t7 > 0 ? s7 / t7 : 0;
  const last30Rate = t30 > 0 ? s30 / t30 : 0;
  const momentumScore = Math.round(last7Rate * 100);
  const trend: "up" | "down" | "flat" = last7Rate > last30Rate + 0.05 ? "up" : last7Rate < last30Rate - 0.05 ? "down" : "flat";

  const dow90: { done: number; total: number }[] = Array.from({ length: 7 }, () => ({ done: 0, total: 0 }));
  for (let i = 0; i < 90; i++) {
    const d = daysAgo(i); const dow = d.getDay(); const ds = dateStr(d); const sched = scheduledOnDate(d);
    if (sched > 0) { dow90[dow].total += sched; dow90[dow].done += Math.min(completionsByDate[ds] ?? 0, sched); }
  }
  const bestDayOfWeek = dow90.map((v, idx) => ({ day: idx, label: DAY_LABELS[idx], rate: v.total > 0 ? v.done / v.total : 0 }));

  return NextResponse.json({ momentumScore, trend, heatmapData, bestDayOfWeek });
}
