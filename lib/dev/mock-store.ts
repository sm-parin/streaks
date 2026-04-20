/**
 * In-memory reactive store for dev-mode mock data.
 *
 * Uses a simple pub/sub pattern so multiple hooks get notified when
 * data changes (e.g. toggling a completion or editing a task).
 */

import type { Task, TaskCompletion, DayOfWeek } from "@/lib/types";
import { toLocalDateString } from "@/lib/utils/date";

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateString(d);
}

// ΓöÇΓöÇΓöÇ Seed data ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const DUMMY_USER_ID = "dev-user-001";

/** Sample tasks covering different schedules */
const SEED_TASKS: Task[] = [
  {
    id: "task-1",
    user_id: DUMMY_USER_ID,
    name: "Morning Run",
    description: "30 min outdoor run",
    active_days: [1, 2, 3, 4, 5], // MonΓÇôFri
    color: "#F07F13",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "task-2",
    user_id: DUMMY_USER_ID,
    name: "Read 20 Pages",
    description: "Non-fiction only",
    active_days: [0, 1, 2, 3, 4, 5, 6], // Every day
    color: "#3B82F6",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "task-3",
    user_id: DUMMY_USER_ID,
    name: "Meditate",
    description: "10 min mindfulness session",
    active_days: [0, 1, 2, 3, 4, 5, 6], // Every day
    color: "#8B5CF6",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "task-4",
    user_id: DUMMY_USER_ID,
    name: "Strength Training",
    description: "Gym ΓÇô push/pull/legs rotation",
    active_days: [1, 3, 5], // Mon, Wed, Fri
    color: "#EF4444",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "task-5",
    user_id: DUMMY_USER_ID,
    name: "Weekly Review",
    description: "Plan next week, review goals",
    active_days: [0], // Sunday only
    color: "#22C55E",
    is_active: false, // Paused ΓÇô to show that state
    created_at: new Date().toISOString(),
  },
];

/**
 * Generates realistic completion history for the last 21 days.
 * Each active task has ~80% completion rate to make streaks look interesting.
 */
function buildSeedCompletions(): TaskCompletion[] {
  const completions: TaskCompletion[] = [];

  SEED_TASKS.filter((t) => t.is_active).forEach((task) => {
    for (let i = 0; i <= 21; i++) {
      const date = daysAgo(i);
      const dayOfWeek = new Date(date + "T00:00:00").getDay() as DayOfWeek;
      if (!task.active_days.includes(dayOfWeek)) continue;

      /** Skip ~20% of days to simulate occasional misses */
      const deterministicSkip =
        (parseInt(task.id.replace("task-", ""), 10) * 7 + i) % 5 === 0;
      if (deterministicSkip) continue;

      completions.push({
        id: `comp-${task.id}-${date}`,
        task_id: task.id,
        user_id: DUMMY_USER_ID,
        completed_date: date,
        created_at: new Date(date + "T08:00:00").toISOString(),
      });
    }
  });

  return completions;
}

// ΓöÇΓöÇΓöÇ Reactive store ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

type Listener = () => void;

let _tasks: Task[] = [...SEED_TASKS];
let _completions: TaskCompletion[] = buildSeedCompletions();
const _listeners = new Set<Listener>();

/** Notifies all subscribed hooks after a mutation */
function notify() {
  _listeners.forEach((fn) => fn());
}

// ΓöÇΓöÇΓöÇ Public API ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const devStore = {
  /** The fake authenticated user id */
  userId: DUMMY_USER_ID,

  // ΓöÇΓöÇ Tasks ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  /** Returns a shallow copy of all tasks */
  getTasks(): Task[] {
    return [..._tasks];
  },

  /** Appends a new task */
  addTask(data: Omit<Task, "id" | "user_id" | "created_at">): Task {
    const task: Task = {
      ...data,
      id: `task-${uid()}`,
      user_id: DUMMY_USER_ID,
      created_at: new Date().toISOString(),
    };
    _tasks = [..._tasks, task];
    notify();
    return task;
  },

  /** Updates mutable fields on an existing task */
  updateTask(id: string, patch: Partial<Task>): boolean {
    const idx = _tasks.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    _tasks = _tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    notify();
    return true;
  },

  /** Permanently removes a task and its completions */
  deleteTask(id: string): boolean {
    _tasks = _tasks.filter((t) => t.id !== id);
    _completions = _completions.filter((c) => c.task_id !== id);
    notify();
    return true;
  },

  // ΓöÇΓöÇ Completions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  /**
   * Returns completions within an optional date range.
   * If no range is given, returns all completions.
   */
  getCompletions(startDate?: string, endDate?: string): TaskCompletion[] {
    return _completions.filter((c) => {
      if (startDate && c.completed_date < startDate) return false;
      if (endDate && c.completed_date > endDate) return false;
      return true;
    });
  },

  /** Toggles a completion record for a given task + date */
  toggleCompletion(taskId: string, date: string): void {
    const existing = _completions.find(
      (c) => c.task_id === taskId && c.completed_date === date
    );
    if (existing) {
      _completions = _completions.filter((c) => c.id !== existing.id);
    } else {
      _completions = [
        ..._completions,
        {
          id: `comp-${taskId}-${date}-${uid()}`,
          task_id: taskId,
          user_id: DUMMY_USER_ID,
          completed_date: date,
          created_at: new Date().toISOString(),
        },
      ];
    }
    notify();
  },

  // ΓöÇΓöÇ Subscriptions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  /** Subscribes to store changes. Returns an unsubscribe function. */
  subscribe(fn: Listener): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};
