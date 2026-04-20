import type { Task, TaskCompletion, DayOfWeek } from "@/lib/types";
import { toLocalDateString } from "@/lib/utils/date";
import { MAX_STREAK_LOOKBACK_DAYS } from "@/lib/utils/constants";

// ΓöÇΓöÇΓöÇ Private Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Returns true if the given ISO date string falls on a day scheduled for `task`.
 */
function isScheduledDay(task: Task, dateStr: string): boolean {
  const dayOfWeek = new Date(dateStr + "T00:00:00").getDay() as DayOfWeek;
  return task.active_days.includes(dayOfWeek);
}

/**
 * Returns the ISO date string for the day before `dateStr`.
 */
function subtractDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return toLocalDateString(d);
}

/**
 * Returns the ISO date string for the day after `dateStr`.
 */
function addDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return toLocalDateString(d);
}

// ΓöÇΓöÇΓöÇ Public Utilities ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Calculates the current (active) streak for a task.
 *
 * Definition: consecutive scheduled days completed, going backwards from today.
 * Non-scheduled days are transparent ΓÇô they neither add to nor break the streak.
 *
 * @param task        - The task definition (used for active_days)
 * @param completions - All completion records for this task
 * @param today       - ISO date string for "today" (YYYY-MM-DD)
 * @returns           Current streak count (ΓëÑ 0)
 */
export function calculateCurrentStreak(
  task: Task,
  completions: TaskCompletion[],
  today: string
): number {
  const completedDates = new Set(completions.map((c) => c.completed_date));
  let streak = 0;
  let cursor = today;

  for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS; i++) {
    if (!isScheduledDay(task, cursor)) {
      /** Skip non-scheduled days silently */
      cursor = subtractDay(cursor);
      continue;
    }

    if (completedDates.has(cursor)) {
      streak++;
      cursor = subtractDay(cursor);
    } else {
      /** Scheduled day was not completed ΓÇô streak is broken */
      break;
    }
  }

  return streak;
}

/**
 * Calculates the longest streak ever achieved for a task across all time.
 *
 * Iterates through every date from the earliest completion to today,
 * tracking the maximum run of consecutive completed scheduled days.
 *
 * @param task        - The task definition
 * @param completions - All completion records for this task
 * @returns           Longest streak count (ΓëÑ 0)
 */
export function calculateLongestStreak(
  task: Task,
  completions: TaskCompletion[]
): number {
  if (completions.length === 0) return 0;

  const completedDates = new Set(completions.map((c) => c.completed_date));
  const sortedDates = [...completions]
    .map((c) => c.completed_date)
    .sort((a, b) => a.localeCompare(b));

  const startDate = sortedDates[0];
  const endDate = toLocalDateString(new Date()); // scan up to today

  let longest = 0;
  let current = 0;
  let cursor = startDate;

  /** Safety cap: 2├ù the max lookback to prevent infinite loops */
  const cap = MAX_STREAK_LOOKBACK_DAYS * 2;

  for (let i = 0; cursor <= endDate && i < cap; i++) {
    if (!isScheduledDay(task, cursor)) {
      cursor = addDay(cursor);
      continue;
    }

    if (completedDates.has(cursor)) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }

    cursor = addDay(cursor);
  }

  return longest;
}
