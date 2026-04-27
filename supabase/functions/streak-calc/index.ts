// @ts-nocheck — Deno runtime; no @types/deno in this repo
// Deployed via: supabase functions deploy streak-calc
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type DayStatus = "completed" | "grace" | "missed" | "not_scheduled";

interface RecentDay { date: string; status: DayStatus; }
interface StreakResult {
  task_id: string; currentStreak: number; longestStreak: number;
  totalCompletions: number; completedToday: boolean; lastCompleted: string | null;
  recentDays: RecentDay[];
}
interface Task { id: string; title: string; priority: number; active_days: number[]; allow_grace: boolean; }
interface Completion { id: string; task_id: string; completed_date: string; is_grace: boolean; }

function subtractDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}
function getDOW(dateStr: string): number { return new Date(dateStr + "T00:00:00Z").getUTCDay(); }
function daysBetween(a: string, b: string): number {
  return Math.round(Math.abs(new Date(a + "T00:00:00Z").getTime() - new Date(b + "T00:00:00Z").getTime()) / 86_400_000);
}
function isScheduled(task: Task, dateStr: string): boolean { return task.active_days.includes(getDOW(dateStr)); }

function computeCurrentStreak(task: Task, completionMap: Map<string, boolean>, today: string): { streak: number; graceDays: string[] } {
  const graceDays: string[] = [];
  let streak = 0; let cursor = today; let graceUsedAt: string | null = null;
  for (let i = 0; i < 730; i++) {
    if (!isScheduled(task, cursor)) { cursor = subtractDays(cursor, 1); continue; }
    const hasCompletion = completionMap.has(cursor);
    const isGraceRow = hasCompletion && completionMap.get(cursor) === true;
    if (hasCompletion && !isGraceRow) { streak++; cursor = subtractDays(cursor, 1); continue; }
    if (hasCompletion && isGraceRow) { streak++; if (!graceUsedAt) graceUsedAt = cursor; cursor = subtractDays(cursor, 1); continue; }
    if (!task.allow_grace || graceUsedAt !== null) {
      if (graceUsedAt && daysBetween(cursor, graceUsedAt) <= 7) break;
      break;
    }
    graceUsedAt = cursor; graceDays.push(cursor); streak++; cursor = subtractDays(cursor, 1);
  }
  return { streak, graceDays };
}

function computeLongestStreak(task: Task, completedDates: Set<string>): number {
  let longest = 0; let current = 0; const today = new Date().toISOString().split("T")[0]; let cursor = today;
  for (let i = 0; i < 730; i++) {
    if (!isScheduled(task, cursor)) { cursor = subtractDays(cursor, 1); continue; }
    if (completedDates.has(cursor)) { current++; longest = Math.max(longest, current); } else { current = 0; }
    cursor = subtractDays(cursor, 1);
  }
  return longest;
}

function buildRecentDays(task: Task, completionMap: Map<string, boolean>, today: string, graceDaysSet: Set<string>): RecentDay[] {
  const days: RecentDay[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = subtractDays(today, i);
    if (!isScheduled(task, date)) { days.push({ date, status: "not_scheduled" }); continue; }
    if (completionMap.has(date)) {
      const isGrace = completionMap.get(date) === true || graceDaysSet.has(date);
      days.push({ date, status: isGrace ? "grace" : "completed" });
    } else if (graceDaysSet.has(date)) {
      days.push({ date, status: "grace" });
    } else {
      days.push({ date, status: date <= today ? "missed" : "not_scheduled" });
    }
  }
  return days;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: { "Content-Type": "application/json" } });
    const anonClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    const targetUserId = user.id;
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: tasks, error: taskErr } = await db.from("tasks").select("id, title, priority, active_days, allow_grace").eq("user_id", targetUserId).eq("is_recurring", true).not("status", "eq", "rejected");
    if (taskErr) throw new Error(taskErr.message);
    if (!tasks || tasks.length === 0) return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    const taskIds = tasks.map((t: Task) => t.id);
    const today = new Date().toISOString().split("T")[0];
    const since = subtractDays(today, 730);
    const { data: completions, error: compErr } = await db.from("task_completions").select("id, task_id, completed_date, is_grace").in("task_id", taskIds).gte("completed_date", since).order("completed_date", { ascending: false });
    if (compErr) throw new Error(compErr.message);
    const allCompletions: Completion[] = completions ?? [];
    const graceInserts: { task_id: string; user_id: string; completed_date: string; is_grace: boolean }[] = [];
    const results: StreakResult[] = tasks.map((task: Task) => {
      const taskCompletions = allCompletions.filter((c) => c.task_id === task.id);
      const completionMap = new Map<string, boolean>(taskCompletions.map((c) => [c.completed_date, c.is_grace]));
      const completedDates = new Set(taskCompletions.map((c) => c.completed_date));
      const { streak: currentStreak, graceDays } = computeCurrentStreak(task, completionMap, today);
      for (const gd of graceDays) { if (!completedDates.has(gd)) graceInserts.push({ task_id: task.id, user_id: targetUserId, completed_date: gd, is_grace: true }); }
      const graceDaysSet = new Set(graceDays);
      const longestStreak = computeLongestStreak(task, completedDates);
      const sortedDates = [...completedDates].sort((a, b) => b.localeCompare(a));
      return { task_id: task.id, currentStreak, longestStreak, totalCompletions: taskCompletions.length, completedToday: completedDates.has(today), lastCompleted: sortedDates[0] ?? null, recentDays: buildRecentDays(task, completionMap, today, graceDaysSet) };
    });
    if (graceInserts.length > 0) await db.from("task_completions").upsert(graceInserts, { onConflict: "task_id,user_id,completed_date" }).select();
    return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
});
