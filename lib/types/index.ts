/** Day of week integer: 0 = Sunday, 1 = Monday ΓÇª 6 = Saturday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A habit task configured by the user */
export interface Task {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  /** Array of scheduled days. e.g. [1,2,3,4,5] = MonΓÇôFri */
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
  /** Fraction 0ΓÇô1 */
  completionRate: number;
}

/** Authenticated user profile stored in the profiles table */
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
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

/** Severity levels for toast notifications */
export type ToastType = "success" | "error" | "warning" | "info";

/** A single toast notification entry */
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  /** Auto-dismiss delay in ms. Defaults to 4000. */
  duration?: number;
}
