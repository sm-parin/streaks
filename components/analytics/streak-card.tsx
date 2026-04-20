"use client";

import { Flame, Trophy, Calendar } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getLastNDays, DAY_NAMES_SHORT } from "@/lib/utils/date";
import { STREAK_HISTORY_DAYS } from "@/lib/utils/constants";
import type { TaskStreak, DayOfWeek } from "@/lib/types";

interface StreakCardProps {
  taskStreak: TaskStreak;
  className?: string;
}

/**
 * Displays all streak statistics for a single task:
 * - Current streak, longest streak, and total completions
 * - A N-day history row showing completed / missed / unscheduled days
 */
export function StreakCard({ taskStreak, className }: StreakCardProps) {
  const {
    task,
    currentStreak,
    longestStreak,
    totalCompletions,
    completedToday,
    completions,
  } = taskStreak;

  const recentDays = getLastNDays(STREAK_HISTORY_DAYS);
  const completedDates = new Set(completions.map((c) => c.completed_date));

  return (
    <div
      className={cn(
        "bg-[var(--color-surface-raised)] rounded-[var(--radius-xl)]",
        "border border-[var(--color-border)] shadow-[var(--shadow-sm)]",
        "p-4",
        className
      )}
      style={{ borderLeftColor: task.color, borderLeftWidth: "3px" }}
    >
      {/** Task name + today badge */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <h3 className="font-semibold text-[var(--color-text-primary)] text-sm leading-tight">
          {task.name}
        </h3>
        {completedToday && (
          <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-[var(--radius-full)] bg-[var(--color-success-bg)] text-[var(--color-success)]">
            Γ£ô Today
          </span>
        )}
      </div>

      {/** Stat row */}
      <div className="flex items-center gap-1 mb-4">
        <StatPill
          icon={<Flame className="w-3.5 h-3.5 text-[var(--color-brand)]" />}
          value={currentStreak}
          label="streak"
        />
        <div className="w-px h-6 bg-[var(--color-border)]" />
        <StatPill
          icon={<Trophy className="w-3.5 h-3.5 text-[var(--color-warning)]" />}
          value={longestStreak}
          label="best"
        />
        <div className="w-px h-6 bg-[var(--color-border)]" />
        <StatPill
          icon={<Calendar className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />}
          value={totalCompletions}
          label="total"
        />
      </div>

      {/** History dots ΓÇô last N days */}
      <div className="flex items-end gap-1" aria-label={`${STREAK_HISTORY_DAYS}-day completion history`}>
        {recentDays.map((date) => {
          const dayOfWeek = new Date(date + "T00:00:00").getDay() as DayOfWeek;
          const isScheduled = task.active_days.includes(dayOfWeek);
          const isCompleted = completedDates.has(date);

          return (
            <div key={date} className="flex flex-col items-center gap-1 flex-1">
              <div
                title={date}
                aria-label={`${date}: ${
                  !isScheduled ? "not scheduled" : isCompleted ? "completed" : "missed"
                }`}
                className={cn(
                  "w-full rounded-[var(--radius-xs)]",
                  isScheduled ? "h-4" : "h-2",
                  isCompleted
                    ? "opacity-100"
                    : isScheduled
                    ? "bg-[var(--color-border-strong)] opacity-60"
                    : "bg-[var(--color-border)] opacity-30"
                )}
                style={
                  isCompleted
                    ? { backgroundColor: task.color }
                    : undefined
                }
              />
              <span className="text-[9px] text-[var(--color-text-disabled)] select-none">
                {DAY_NAMES_SHORT[dayOfWeek]?.charAt(0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ΓöÇΓöÇΓöÇ Private sub-component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function StatPill({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2">
      {icon}
      <span className="text-xl font-bold text-[var(--color-text-primary)] tabular-nums">
        {value}
      </span>
      <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
    </div>
  );
}
