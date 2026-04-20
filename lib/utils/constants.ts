/** Brand colour and preset task colour palette */
export const BRAND_COLOR = "#F07F13";

/**
 * Preset colour swatches available when creating or editing a task.
 * The first entry is the brand orange.
 */
export const TASK_COLORS = [
  "#F07F13", // brand orange
  "#EF4444", // red
  "#F59E0B", // amber
  "#22C55E", // green
  "#10B981", // emerald
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#6B7280", // neutral
] as const;

/** Default colour assigned to new tasks */
export const DEFAULT_TASK_COLOR = TASK_COLORS[0];

/** Maximum number of days to look back when computing streaks */
export const MAX_STREAK_LOOKBACK_DAYS = 730;

/** Number of days displayed in the streak history row on StreakCard */
export const STREAK_HISTORY_DAYS = 14;

/** Number of past days fetched for analytics (covers streak computation) */
export const ANALYTICS_FETCH_DAYS = 90;
