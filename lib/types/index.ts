/** Day of week integer: 0 = Sunday, 1 = Monday ... 6 = Saturday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A habit task configured by the user */
export interface Task {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  /** Array of scheduled days. e.g. [1,2,3,4,5] = Mon-Fri */
  active_days: DayOfWeek[];
  /** Hex colour string used as a visual identifier */
  color: string;
  is_active: boolean;
  created_at: string;
}

/** A single task completion record for one date */
export interface TaskCompletion {
  id: string;
  task_id: string;
  user_id: string;
  /** ISO date string: YYYY-MM-DD */
  completed_date: string;
  created_at: string;
}

/** Computed streak analytics for a single task */
export interface TaskStreak {
  task: Task;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  /** ISO date of the most recent completion, or null */
  lastCompleted: string | null;
  completedToday: boolean;
  /** Raw completions used for history visualisation */
  completions: TaskCompletion[];
}

/** A summary of task completions for a single calendar day */
export interface DailyReport {
  /** ISO date: YYYY-MM-DD */
  date: string;
  completedTasks: Task[];
  scheduledTasks: Task[];
  /** Fraction 0-1 */
  completionRate: number;
}

/** Authenticated user profile */
export interface Profile {
  id: string;
  email: string;
  created_at: string;
  username?: string;
  bio?: string;
  default_active_days?: number[];
  timezone?: string;
}

/** Values submitted by the task creation / edit form */
export interface TaskFormData {
  name: string;
  description?: string;
  active_days: DayOfWeek[];
  color: string;
}

/** Theme preference stored in localStorage */
export type Theme = "light" | "dark" | "system";

// --- New v2 domain types ---------------------------------------------------

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  active_days: number[];
  priority: 1 | 2 | 3 | 4 | 5;
  tag_ids: string[];
  is_active: boolean;
  created_at: string;
}

export interface GoalStreak {
  current: number;
  longest: number;
  total: number;
  last_completed: string | null;
  completed_today: boolean;
}

export interface GoalWithStreak extends Goal {
  streak: GoalStreak;
}

export interface Activity {
  id: string;
  user_id: string;
  assigner_user_id: string | null;
  assignee_user_id: string | null;
  group_id: string | null;
  title: string;
  description: string | null;
  activity_date: string | null;
  activity_time: string | null;
  priority: 1 | 2 | 3 | 4 | 5;
  tag_ids: string[];
  status: "pending" | "accepted" | "completed" | "rejected";
  reminder_minutes: number[];
  /** Joined username of the assigner, populated by API responses */
  creator_username?: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface SubRecord {
  id: string;
  goal_id: string | null;
  activity_id: string | null;
  user_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  username?: string;
  bio?: string;
  default_active_days?: number[];
  timezone?: string;
}

/** Alias used by use-user hook and auth API */
export type User = UserProfile;

export interface Friendship {
  id: string;
  status: "pending" | "accepted" | "blocked";
  auto_accept_activities: boolean;
  is_requester: boolean;
  friend: {
    id: string;
    username: string;
    nickname: string;
    avatar_url: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  member_count: number;
  my_role: "owner" | "admin" | "member";
  my_status: "active" | "pending";
  created_at: string;
}

export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "activity_assigned"
  | "activity_accepted"
  | "activity_rejected"
  | "group_invite"
  | "group_activity"
  | "group_accepted";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

// --- Constants -------------------------------------------------------------

/** Per-tab accent colours matching the spec */
export const TAB_COLORS = {
  streaks:  "#EAB308",   // yellow
  records:  "#22C55E",   // green
  today:    "#F07F13",   // orange (brand)
  social:   "#3B82F6",   // blue
  settings: "#EF4444",   // red
} as const;

/** Priority badge colours (1 = highest) */
export const PRIORITY_COLORS: Record<number, string> = {
  1: "#EF4444",  // red
  2: "#F97316",  // orange
  3: "#EAB308",  // yellow
  4: "#3B82F6",  // blue
  5: "#6B7280",  // gray
};

/** Human-readable priority labels */
export const PRIORITY_LABELS: Record<number, string> = {
  1: "Critical",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Minimal",
};

/** Short day-of-week labels indexed 0 (Sun) - 6 (Sat) */
export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// --- Performance helpers ---------------------------------------------------

/**
 * Maps a completion rate (0-1) to one of the five colour names:
 * 0-20% red | 21-40% yellow | 41-60% blue | 61-80% green | 81-100% orange
 */
export function getPerformanceColor(rate: number): string {
  if (rate <= 0.20) return "red";
  if (rate <= 0.40) return "yellow";
  if (rate <= 0.60) return "blue";
  if (rate <= 0.80) return "green";
  return "orange";
}

/** Maps a completion rate to a human-readable performance label */
export function getPerformanceLabel(rate: number): string {
  if (rate <= 0.20) return "Poor";
  if (rate <= 0.40) return "Bad";
  if (rate <= 0.60) return "Average";
  if (rate <= 0.80) return "Good";
  return "Excellent";
}

/** Severity levels for toast notifications */
export type ToastType = "success" | "error" | "warning" | "info";

/** A single toast notification item */
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}