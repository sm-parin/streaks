/**
 * Converts a Date object to a local ISO date string (YYYY-MM-DD).
 * Uses the device's local timezone ΓÇô not UTC ΓÇô to avoid off-by-one errors
 * at midnight boundaries.
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's date as a local ISO date string (YYYY-MM-DD).
 */
export function getTodayString(): string {
  return toLocalDateString(new Date());
}

/**
 * Returns the last `n` days as an array of local ISO date strings.
 * Sorted oldest ΓåÆ newest; inclusive of today.
 *
 * @param n - Number of days to include (e.g. 14, 30, 90)
 */
export function getLastNDays(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(toLocalDateString(d));
  }
  return dates;
}

/**
 * Formats an ISO date string for human-readable display.
 * Example: "2026-04-21" ΓåÆ "Tue, Apr 21"
 */
export function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Returns a relative label for a date string:
 * "Today", "Yesterday", or the formatted date.
 */
export function formatRelativeDate(dateStr: string): string {
  const today = getTodayString();
  const yesterday = toLocalDateString(
    new Date(new Date().setDate(new Date().getDate() - 1))
  );
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return formatDisplayDate(dateStr);
}

/** Full day names indexed by JS day-of-week (0 = Sunday) */
export const DAY_NAMES: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

/** Short day names indexed by JS day-of-week (0 = Sunday) */
export const DAY_NAMES_SHORT: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};
