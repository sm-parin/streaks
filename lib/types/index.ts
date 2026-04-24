/** Day of week: 0=Sun, 1=Mon ... 6=Sat */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Priority = 1 | 2 | 3 | 4 | 5;

export type RecordStatus = "pending" | "accepted" | "completed" | "rejected";

/** Raw DB row — same shape for both tasks and lists */
export interface DBRecord {
  id: string;
  kind: "task" | "list";
  user_id: string;
  title: string;
  priority: Priority;
  tag_ids: string[];
  status: RecordStatus;
  updated_at: string;
  created_at: string;
  // task-only
  description: string | null;
  is_recurring: boolean;
  active_days: DayOfWeek[];
  specific_date: string | null;   // ISO date YYYY-MM-DD
  time_from: string | null;       // HH:MM
  time_to: string | null;         // HH:MM
  assigner_user_id: string | null;
  assignee_user_id: string | null;
  group_id: string | null;
  list_id: string | null;
  // list-only
  social_mutual: Array<{ type: "user" | "group"; id: string }>;
}

/** Task record (kind = 'task') */
export interface Task extends DBRecord {
  kind: "task";
  tasks?: never;
}

/** List record (kind = 'list') with its tasks populated */
export interface List extends DBRecord {
  kind: "list";
  tasks?: Task[];
}

export type AppRecord = Task | List;

export function isTask(r: DBRecord): r is Task { return r.kind === "task"; }
export function isList(r: DBRecord): r is List  { return r.kind === "list"; }

/** Completion entry for a recurring task (one row per day) */
export interface RecordCompletion {
  id: string;
  record_id: string;
  user_id: string;
  completed_date: string;  // YYYY-MM-DD
  created_at: string;
}

/** Tag */
export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

/** Notification */
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

/** Friendship */
export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "blocked";
  auto_accept_tasks: boolean;
  created_at: string;
  updated_at: string;
  friend?: { id: string; username: string; nickname: string };
  is_requester?: boolean;
}

/** Group */
export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  /** Populated by API when listing user's groups */
  my_status?: "pending" | "active";
  my_role?: "owner" | "admin" | "member";
}

/** Authenticated user */
export interface User {
  id: string;
  email: string;
  username?: string;
  bio?: string;
  default_active_days?: number[];
  timezone?: string;
}

/** Toast notification */
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

/** Toast type alias (includes warning for backwards compat) */
export type ToastType = "success" | "error" | "info" | "warning";

/** Theme */
export type Theme = "light" | "dark" | "system";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Priority strip/label colors: P1=red, P2=yellow, P3=orange, P4=blue, P5=green */
export const PRIORITY_COLORS: Record<Priority, string> = {
  1: "#EF4444",
  2: "#EAB308",
  3: "#F07F13",
  4: "#3B82F6",
  5: "#22C55E",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  1: "P1", 2: "P2", 3: "P3", 4: "P4", 5: "P5",
};

export const PRIORITY_NAMES: Record<Priority, string> = {
  1: "Critical", 2: "High", 3: "Medium", 4: "Low", 5: "Minimal",
};

/**
 * Reminder fire times in minutes-before-start, by priority.
 * P1 = 5 reminders, P5 = 1 (at start only).
 */
export const REMINDER_TIMES_BY_PRIORITY: Record<Priority, number[]> = {
  1: [60, 30, 15, 5, 0],
  2: [30, 15, 5, 0],
  3: [15, 5, 0],
  4: [5, 0],
  5: [0],
};

/** Snooze gap in minutes by priority */
export const SNOOZE_GAP_BY_PRIORITY: Record<Priority, number> = {
  1: 5, 2: 10, 3: 15, 4: 20, 5: 30,
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Tab accent colors */
export const TAB_COLORS = {
  streaks: "#EF4444",
  records: "#EAB308",
  today:   "#F07F13",
  social:  "#3B82F6",
  inbox:   "#22C55E",
} as const;
