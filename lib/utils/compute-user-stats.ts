import type { Task, TaskCompletion, StreakResult } from "@/lib/types";
import {
  MILESTONE_DAILY_BASE,
  MILESTONE_WEEKLY_DENOMINATOR,
  MILESTONE_MONTHLY_DENOMINATOR,
  MILESTONE_YEARLY_DENOMINATOR,
} from "./stats-constants";

export interface UserStatsInput {
  recurringTasks: Task[];
  taskCompletions: TaskCompletion[];
  streakResults: StreakResult[];
  todayDate: string; // YYYY-MM-DD
}

export interface ComputedStats {
  streak_consistency_rating: number | null;
  streak_discipline_pct: number | null;
  milestone_consistency_rating: number | null;
  daily_milestone: number | null;
  weekly_milestone: number | null;
  monthly_milestone: number | null;
  yearly_milestone: number | null;
}

function roundStat(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function getDOW(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay();
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

export function computeUserStats(input: UserStatsInput): ComputedStats {
  const { recurringTasks, taskCompletions, streakResults, todayDate } = input;

  // Active recurring non-global tasks (current state)
  const activeTasks = recurringTasks.filter(
    (t) => !t.is_disabled && t.is_recurring && !t.is_global
  );
  const activeTaskIds = new Set(activeTasks.map((t) => t.id));

  // ── Streak Consistency Rating ─────────────────────────────────────────────
  let streak_consistency_rating: number | null = null;
  if (streakResults.length > 0) {
    const weights = streakResults.map(
      (s) => Math.max(0, 100 - s.timesStreakBroken) / 100
    );
    streak_consistency_rating = roundStat(
      weights.reduce((a, b) => a + b, 0) / weights.length
    );
  }

  // ── Streak Discipline ─────────────────────────────────────────────────────
  let streak_discipline_pct: number | null = null;
  {
    const total = recurringTasks.filter(
      (t) => t.is_recurring && !t.is_global
    ).length;
    if (total > 0) {
      streak_discipline_pct = roundStat((activeTasks.length * 100) / total);
    }
  }

  // ── Milestone computations ────────────────────────────────────────────────
  // Count completions per date (only for active tasks)
  const completionsByDate = new Map<string, number>();
  for (const c of taskCompletions) {
    if (!activeTaskIds.has(c.task_id)) continue;
    completionsByDate.set(
      c.completed_date,
      (completionsByDate.get(c.completed_date) ?? 0) + 1
    );
  }

  // Build rate-per-date map (skip days with no scheduled tasks)
  const allDates = new Set([...completionsByDate.keys(), todayDate]);
  const rateByDate = new Map<string, number>();
  for (const dateStr of allDates) {
    if (dateStr > todayDate) continue; // skip future
    const dow = getDOW(dateStr);
    const scheduled = activeTasks.filter((t) =>
      (t.active_days as number[]).includes(dow)
    ).length;
    if (scheduled === 0) continue;
    const completed = completionsByDate.get(dateStr) ?? 0;
    rateByDate.set(dateStr, Math.min(1, completed / scheduled));
  }

  // daily
  const daily_milestone = roundStat(rateByDate.get(todayDate) ?? 0);

  // weekly
  const { start: weekStart, end: weekEnd } = getWeekBounds(todayDate);
  let weekSum = 0;
  for (const [date, rate] of rateByDate) {
    if (date >= weekStart && date <= weekEnd) weekSum += rate;
  }
  const weekly_milestone = roundStat(weekSum / MILESTONE_WEEKLY_DENOMINATOR);

  // monthly
  const monthPrefix = todayDate.slice(0, 7);
  let monthSum = 0;
  for (const [date, rate] of rateByDate) {
    if (date.startsWith(monthPrefix)) monthSum += rate;
  }
  const monthly_milestone = roundStat(monthSum / MILESTONE_MONTHLY_DENOMINATOR);

  // yearly
  const yearPrefix = todayDate.slice(0, 4);
  let yearSum = 0;
  for (const [date, rate] of rateByDate) {
    if (date.startsWith(yearPrefix)) yearSum += rate;
  }
  const yearly_milestone = roundStat(yearSum / MILESTONE_YEARLY_DENOMINATOR);

  // Milestone Consistency Rating
  let milestone_consistency_rating: number | null = null;
  if (rateByDate.size > 0) {
    let totalRate = 0;
    for (const rate of rateByDate.values()) totalRate += rate;
    milestone_consistency_rating = roundStat(
      totalRate / (rateByDate.size * MILESTONE_DAILY_BASE)
    );
  }

  return {
    streak_consistency_rating,
    streak_discipline_pct,
    milestone_consistency_rating,
    daily_milestone,
    weekly_milestone,
    monthly_milestone,
    yearly_milestone,
  };
}
