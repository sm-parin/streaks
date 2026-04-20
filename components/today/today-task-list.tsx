"use client";

import { useMemo } from "react";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useCompletions } from "@/lib/hooks/use-completions";
import { getTodayString, formatDisplayDate } from "@/lib/utils/date";
import { TaskItem } from "./task-item";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import type { DayOfWeek } from "@/lib/types";

/**
 * Renders the list of tasks scheduled for today along with their
 * current completion state. Completed tasks move to the bottom.
 */
export function TodayTaskList() {
  const today = getTodayString();
  const todayDayOfWeek = new Date(today + "T00:00:00").getDay() as DayOfWeek;

  const { tasks, loading: tasksLoading } = useTasks();
  const { completions, loading: completionsLoading, toggleCompletion } =
    useCompletions(today, today);

  const loading = tasksLoading || completionsLoading;

  /** Filter to active tasks scheduled for today, sorted incomplete-first */
  const todayTasks = useMemo(() => {
    if (loading) return [];

    const scheduled = tasks.filter(
      (t) => t.is_active && t.active_days.includes(todayDayOfWeek)
    );

    return [...scheduled].sort((a, b) => {
      const aCompleted = completions.some((c) => c.task_id === a.id);
      const bCompleted = completions.some((c) => c.task_id === b.id);
      if (aCompleted === bCompleted) return 0;
      return aCompleted ? 1 : -1;
    });
  }, [tasks, completions, loading, todayDayOfWeek]);

  const completedCount = todayTasks.filter((t) =>
    completions.some((c) => c.task_id === t.id)
  ).length;

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[68px] rounded-[var(--radius-xl)]" />
        ))}
      </div>
    );
  }

  if (todayTasks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3" aria-hidden="true">
          ≡ƒÄë
        </p>
        <p className="font-medium text-[var(--color-text-primary)]">
          No tasks scheduled today.
        </p>
        <p className="text-sm text-[var(--color-text-disabled)] mt-1">
          Enjoy your free day! Configure tasks in the Settings tab.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/** Progress summary */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {formatDisplayDate(today)}
        </p>
        <span
          className={cn(
            "text-sm font-semibold",
            completedCount === todayTasks.length
              ? "text-[var(--color-success)]"
              : "text-[var(--color-brand)]"
          )}
        >
          {completedCount}/{todayTasks.length} done
        </span>
      </div>

      {/** Progress bar */}
      <div className="h-1 rounded-[var(--radius-full)] bg-[var(--color-border)] overflow-hidden mb-5">
        <div
          className="h-full rounded-[var(--radius-full)] transition-all duration-500"
          style={{
            width: `${
              todayTasks.length > 0
                ? (completedCount / todayTasks.length) * 100
                : 0
            }%`,
            backgroundColor:
              completedCount === todayTasks.length
                ? "var(--color-success)"
                : "var(--color-brand)",
          }}
        />
      </div>

      {/** Task list */}
      <div className="flex flex-col gap-3">
        {todayTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            completion={completions.find((c) => c.task_id === task.id)}
            onToggle={toggleCompletion}
            date={today}
          />
        ))}
      </div>
    </div>
  );
}
