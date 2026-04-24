import type { Task, RecordCompletion, DayOfWeek } from "@/lib/types";
import { toLocalDateString } from "@/lib/utils/date";
import { MAX_STREAK_LOOKBACK_DAYS } from "@/lib/utils/constants";

function isScheduledDay(task: Task, dateStr: string): boolean {
  const dayOfWeek = new Date(dateStr + "T00:00:00").getDay() as DayOfWeek;
  return task.active_days.includes(dayOfWeek);
}

function subtractDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return toLocalDateString(d);
}

export function calculateCurrentStreak(
  task: Task,
  completions: RecordCompletion[],
  today: string
): number {
  const completedDates = new Set(completions.map((c) => c.completed_date));
  let streak = 0;
  let cursor = today;

  for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS; i++) {
    if (!isScheduledDay(task, cursor)) {
      cursor = subtractDay(cursor);
      continue;
    }
    if (!completedDates.has(cursor)) break;
    streak++;
    cursor = subtractDay(cursor);
  }
  return streak;
}

export function calculateLongestStreak(
  task: Task,
  completions: RecordCompletion[],
  today: string
): number {
  const completedDates = new Set(completions.map((c) => c.completed_date));
  let longest = 0;
  let current = 0;
  let cursor = today;

  for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS; i++) {
    if (!isScheduledDay(task, cursor)) {
      cursor = subtractDay(cursor);
      continue;
    }
    if (completedDates.has(cursor)) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
    cursor = subtractDay(cursor);
  }
  return longest;
}

export interface TaskStreak {
  task: Task;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  lastCompleted: string | null;
  completedToday: boolean;
  completions: RecordCompletion[];
}

export function buildTaskStreak(
  task: Task,
  completions: RecordCompletion[],
  today: string
): TaskStreak {
  const taskCompletions = completions.filter((c) => c.record_id === task.id);
  return {
    task,
    currentStreak: calculateCurrentStreak(task, taskCompletions, today),
    longestStreak: calculateLongestStreak(task, taskCompletions, today),
    totalCompletions: taskCompletions.length,
    lastCompleted: taskCompletions.sort((a, b) =>
      b.completed_date.localeCompare(a.completed_date)
    )[0]?.completed_date ?? null,
    completedToday: taskCompletions.some((c) => c.completed_date === today),
    completions: taskCompletions,
  };
}
