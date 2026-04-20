"use client";

import { useMemo } from "react";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useCompletions } from "@/lib/hooks/use-completions";
import { getLastNDays, formatRelativeDate } from "@/lib/utils/date";
import { ANALYTICS_FETCH_DAYS } from "@/lib/utils/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import type { DailyReport, DayOfWeek } from "@/lib/types";

/**
 * Renders a reverse-chronological list of daily completion reports.
 * Each entry shows the date, a progress bar, and completed vs scheduled counts.
 */
export function ReportList() {
  const { tasks, loading: tasksLoading } = useTasks();

  const dates = getLastNDays(ANALYTICS_FETCH_DAYS);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const { completions, loading: completionsLoading } = useCompletions(
    startDate,
    endDate
  );

  const loading = tasksLoading || completionsLoading;

  /** Build a DailyReport for each date that had any scheduled task */
  const reports = useMemo<DailyReport[]>(() => {
    if (loading) return [];

    const activeTasks = tasks.filter((t) => t.is_active);

    return [...dates]
      .reverse()
      .map((date) => {
        const dayOfWeek = new Date(date + "T00:00:00").getDay() as DayOfWeek;

        const scheduledTasks = activeTasks.filter((t) =>
          t.active_days.includes(dayOfWeek)
        );

        const completedTaskIds = new Set(
          completions
            .filter((c) => c.completed_date === date)
            .map((c) => c.task_id)
        );

        const completedTasks = scheduledTasks.filter((t) =>
          completedTaskIds.has(t.id)
        );

        return {
          date,
          scheduledTasks,
          completedTasks,
          completionRate:
            scheduledTasks.length > 0
              ? completedTasks.length / scheduledTasks.length
              : 0,
        };
      })
      .filter((r) => r.scheduledTasks.length > 0);
  }, [tasks, completions, dates, loading]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 rounded-[var(--radius-xl)]" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--color-text-secondary)] font-medium">
          No reports yet.
        </p>
        <p className="text-sm text-[var(--color-text-disabled)] mt-1">
          Complete today's tasks to see your first report.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {reports.map((report) => (
        <DailyReportRow key={report.date} report={report} />
      ))}
    </div>
  );
}

// ΓöÇΓöÇΓöÇ Private sub-component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function DailyReportRow({ report }: { report: DailyReport }) {
  const { date, completedTasks, scheduledTasks, completionRate } = report;
  const pct = Math.round(completionRate * 100);
  const isComplete = completionRate === 1;

  return (
    <div
      className={cn(
        "bg-[var(--color-surface-raised)] border border-[var(--color-border)]",
        "rounded-[var(--radius-xl)] p-4 shadow-[var(--shadow-xs)]"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {formatRelativeDate(date)}
        </span>
        <span
          className={cn(
            "text-xs font-semibold",
            isComplete
              ? "text-[var(--color-success)]"
              : completionRate > 0
              ? "text-[var(--color-brand)]"
              : "text-[var(--color-text-disabled)]"
          )}
        >
          {completedTasks.length}/{scheduledTasks.length} ┬╖ {pct}%
        </span>
      </div>

      {/** Progress bar */}
      <div className="h-1.5 rounded-[var(--radius-full)] bg-[var(--color-border)] overflow-hidden mb-2">
        <div
          className="h-full rounded-[var(--radius-full)] transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: isComplete
              ? "var(--color-success)"
              : "var(--color-brand)",
          }}
        />
      </div>

      {/** Task name chips */}
      <div className="flex flex-wrap gap-1.5">
        {scheduledTasks.map((task) => {
          const done = completedTasks.some((t) => t.id === task.id);
          return (
            <span
              key={task.id}
              className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-[var(--radius-full)]",
                "border transition-colors",
                done
                  ? "border-transparent text-white"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
              )}
              style={done ? { backgroundColor: task.color } : undefined}
            >
              {done ? "Γ£ô " : ""}
              {task.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
