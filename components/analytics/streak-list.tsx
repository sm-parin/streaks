"use client";

import { useMemo } from "react";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useCompletions } from "@/lib/hooks/use-completions";
import { calculateCurrentStreak, calculateLongestStreak } from "@/lib/utils/streak";
import { getTodayString, getLastNDays } from "@/lib/utils/date";
import { ANALYTICS_FETCH_DAYS } from "@/lib/utils/constants";
import { StreakCard } from "./streak-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TaskStreak } from "@/lib/types";

/**
 * Fetches all active tasks and their completion history, computes streak
 * statistics, and renders a sorted list of StreakCard components.
 *
 * Tasks with higher current streaks appear first.
 */
export function StreakList() {
  const { tasks, loading: tasksLoading } = useTasks();

  const startDate = getLastNDays(ANALYTICS_FETCH_DAYS)[0];
  const today = getTodayString();
  const { completions, loading: completionsLoading } = useCompletions(
    startDate,
    today
  );

  const loading = tasksLoading || completionsLoading;

  /** Derive TaskStreak objects from raw tasks + completions */
  const taskStreaks = useMemo<TaskStreak[]>(() => {
    if (loading) return [];

    return tasks
      .filter((t) => t.is_active)
      .map((task) => {
        const taskCompletions = completions.filter(
          (c) => c.task_id === task.id
        );
        const sorted = [...taskCompletions].sort((a, b) =>
          b.completed_date.localeCompare(a.completed_date)
        );

        return {
          task,
          currentStreak: calculateCurrentStreak(task, taskCompletions, today),
          longestStreak: calculateLongestStreak(task, taskCompletions),
          totalCompletions: taskCompletions.length,
          lastCompleted: sorted[0]?.completed_date ?? null,
          completedToday: taskCompletions.some(
            (c) => c.completed_date === today
          ),
          completions: taskCompletions,
        };
      })
      .sort((a, b) => b.currentStreak - a.currentStreak);
  }, [tasks, completions, loading, today]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[148px] rounded-[var(--radius-xl)]" />
        ))}
      </div>
    );
  }

  if (taskStreaks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--color-text-secondary)] font-medium">
          No active tasks yet.
        </p>
        <p className="text-sm text-[var(--color-text-disabled)] mt-1">
          Add tasks in the Configure tab to start tracking streaks.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {taskStreaks.map((ts) => (
        <StreakCard key={ts.task.id} taskStreak={ts} />
      ))}
    </div>
  );
}
