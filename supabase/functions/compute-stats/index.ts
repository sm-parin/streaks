// @ts-nocheck — Deno runtime; no @types/deno in this repo
// Deployed via: supabase functions deploy compute-stats
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── Constants (mirrored from lib/utils/stats-constants.ts) ───────────────────
const MILESTONE_DAILY_BASE = 10;
const MILESTONE_WEEKLY_DENOMINATOR = 70;
const MILESTONE_MONTHLY_DENOMINATOR = 300;
const MILESTONE_YEARLY_DENOMINATOR = 3650;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Task {
  id: string;
  active_days: number[];
  allow_grace: boolean;
  is_disabled: boolean;
  is_recurring: boolean;
  is_global: boolean;
}

interface Completion {
  task_id: string;
  completed_date: string;
  is_grace: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDOW(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay();
}

function subtractDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    Math.abs(
      new Date(a + "T00:00:00Z").getTime() - new Date(b + "T00:00:00Z").getTime()
    ) / 86_400_000
  );
}

function roundStat(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function getWeekBounds(todayDate: string): { start: string; end: string } {
  const d = new Date(todayDate + "T00:00:00Z");
  const dow = d.getUTCDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() - daysFromMon);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return {
    start: mon.toISOString().split("T")[0],
    end: sun.toISOString().split("T")[0],
  };
}

// Compute timesStreakBroken for one task (mirrors streak-calc logic)
function computeTimesStreakBroken(
  task: Task,
  completionMap: Map<string, boolean>,
  today: string
): number {
  let broken = 0;
  let cursor = today;
  let graceUsedAt: string | null = null;
  let inStreak = false;

  for (let i = 0; i < 730; i++) {
    if (!task.active_days.includes(getDOW(cursor))) {
      cursor = subtractDays(cursor, 1);
      continue;
    }
    const hasCompletion = completionMap.has(cursor);
    const isGraceRow = hasCompletion && completionMap.get(cursor) === true;
    if (hasCompletion) {
      inStreak = true;
      if (isGraceRow && !graceUsedAt) graceUsedAt = cursor;
      cursor = subtractDays(cursor, 1);
      continue;
    }
    if (!inStreak) { cursor = subtractDays(cursor, 1); continue; }
    const canUseGrace =
      task.allow_grace &&
      (graceUsedAt === null || daysBetween(cursor, graceUsedAt) > 7);
    if (canUseGrace) {
      graceUsedAt = cursor;
    } else {
      broken++;
      graceUsedAt = null;
      inStreak = false;
    }
    cursor = subtractDays(cursor, 1);
  }
  return broken;
}

// ── Per-user computation ──────────────────────────────────────────────────────
async function processUser(
  db: ReturnType<typeof createClient>,
  userId: string,
  today: string
): Promise<void> {
  // Fetch all recurring tasks (including disabled) for this user
  const { data: taskRows } = await db
    .from("tasks")
    .select("id, active_days, allow_grace, is_disabled, is_recurring, is_global")
    .eq("user_id", userId)
    .eq("is_recurring", true);

  const tasks: Task[] = taskRows ?? [];
  if (tasks.length === 0) return;

  // Fetch all completions for these tasks (all time)
  const taskIds = tasks.map((t: Task) => t.id);
  const { data: compRows } = await db
    .from("task_completions")
    .select("task_id, completed_date, is_grace")
    .in("task_id", taskIds);
  const completions: Completion[] = compRows ?? [];

  // Active tasks: non-disabled, recurring, non-global
  const activeTasks = tasks.filter(
    (t: Task) => !t.is_disabled && t.is_recurring && !t.is_global
  );
  const activeTaskIds = new Set(activeTasks.map((t: Task) => t.id));

  // ── Streak Consistency Rating ───────────────────────────────────────────
  const nonDisabledTasks = tasks.filter(
    (t: Task) => !t.is_disabled && !t.is_global
  );
  let streak_consistency_rating: number | null = null;
  if (nonDisabledTasks.length > 0) {
    const weights = nonDisabledTasks.map((task: Task) => {
      const taskComps = completions.filter(
        (c: Completion) => c.task_id === task.id
      );
      const completionMap = new Map<string, boolean>(
        taskComps.map((c: Completion) => [c.completed_date, c.is_grace])
      );
      const broken = computeTimesStreakBroken(task, completionMap, today);
      return Math.max(0, 100 - broken) / 100;
    });
    streak_consistency_rating = roundStat(
      weights.reduce((a: number, b: number) => a + b, 0) / weights.length
    );
  }

  // ── Streak Discipline ───────────────────────────────────────────────────
  const totalRecurring = tasks.filter(
    (t: Task) => t.is_recurring && !t.is_global
  ).length;
  const streak_discipline_pct =
    totalRecurring > 0
      ? roundStat((activeTasks.length * 100) / totalRecurring)
      : null;

  // ── Milestones ──────────────────────────────────────────────────────────
  const completionsByDate = new Map<string, number>();
  for (const c of completions) {
    if (!activeTaskIds.has(c.task_id)) continue;
    completionsByDate.set(
      c.completed_date,
      (completionsByDate.get(c.completed_date) ?? 0) + 1
    );
  }

  const allDates = new Set([...completionsByDate.keys(), today]);
  const rateByDate = new Map<string, number>();
  for (const dateStr of allDates) {
    if (dateStr > today) continue;
    const dow = getDOW(dateStr);
    const scheduled = activeTasks.filter((t: Task) =>
      t.active_days.includes(dow)
    ).length;
    if (scheduled === 0) continue;
    const completed = completionsByDate.get(dateStr) ?? 0;
    rateByDate.set(dateStr, Math.min(1, completed / scheduled));
  }

  const daily_milestone = roundStat(rateByDate.get(today) ?? 0);

  const { start: weekStart, end: weekEnd } = getWeekBounds(today);
  let weekSum = 0;
  for (const [date, rate] of rateByDate) {
    if (date >= weekStart && date <= weekEnd) weekSum += rate;
  }
  const weekly_milestone = roundStat(weekSum / MILESTONE_WEEKLY_DENOMINATOR);

  const monthPrefix = today.slice(0, 7);
  let monthSum = 0;
  for (const [date, rate] of rateByDate) {
    if (date.startsWith(monthPrefix)) monthSum += rate;
  }
  const monthly_milestone = roundStat(monthSum / MILESTONE_MONTHLY_DENOMINATOR);

  const yearPrefix = today.slice(0, 4);
  let yearSum = 0;
  for (const [date, rate] of rateByDate) {
    if (date.startsWith(yearPrefix)) yearSum += rate;
  }
  const yearly_milestone = roundStat(yearSum / MILESTONE_YEARLY_DENOMINATOR);

  let milestone_consistency_rating: number | null = null;
  if (rateByDate.size > 0) {
    let totalRate = 0;
    for (const rate of rateByDate.values()) totalRate += rate;
    milestone_consistency_rating = roundStat(
      totalRate / (rateByDate.size * MILESTONE_DAILY_BASE)
    );
  }

  // ── Upsert to user_stats_cache ──────────────────────────────────────────
  await db.from("user_stats_cache").upsert(
    {
      user_id: userId,
      streak_consistency_rating,
      streak_discipline_pct,
      milestone_consistency_rating,
      daily_milestone,
      weekly_milestone,
      monthly_milestone,
      yearly_milestone,
      streak_consistency_percentile: null,
      streak_discipline_percentile: null,
      milestone_consistency_percentile: null,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  // Auth: service role key only — this is a server-to-server nightly cron call
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const today = new Date().toISOString().split("T")[0];

    let page = 1;
    let processed = 0;

    while (true) {
      const { data, error } = await db.auth.admin.listUsers({
        page,
        perPage: 100,
      });
      if (error || !data?.users?.length) break;

      for (const user of data.users) {
        await processUser(db, user.id, today);
        processed++;
      }

      if (data.users.length < 100) break;
      page++;
    }

    return new Response(
      JSON.stringify({ processed, computed_at: new Date().toISOString() }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
