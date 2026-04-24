"use client";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PRIORITY_COLORS, DAY_LABELS, type Priority, type DayOfWeek } from "@/lib/types";
import type { TaskStreak } from "@/lib/utils/streak";

interface Props {
  streak: TaskStreak;
  today: string;
}

export function StreakCard({ streak }: Props) {
  const { task, currentStreak, longestStreak, totalCompletions, completedToday } = streak;
  const priorityColor = PRIORITY_COLORS[task.priority as Priority];

  return (
    <div className="relative flex overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
      <div
        className="w-1.5 shrink-0 rounded-l-xl"
        style={{ backgroundColor: priorityColor }}
        aria-hidden="true"
      />
      <div className="flex-1 px-3 py-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight">
            {task.title}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <Flame
              className={cn(
                "w-4 h-4",
                completedToday ? "text-[var(--tab-streaks)]" : "text-[var(--color-text-disabled)]"
              )}
            />
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                completedToday ? "text-[var(--tab-streaks)]" : "text-[var(--color-text-secondary)]"
              )}
            >
              {currentStreak}
            </span>
          </div>
        </div>

        <div className="flex gap-1">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => {
            const active = (task.active_days ?? []).includes(d as DayOfWeek);
            return (
              <div
                key={d}
                title={DAY_LABELS[d]}
                className={cn(
                  "flex-1 h-1.5 rounded-full",
                  active ? "bg-[var(--tab-streaks)]" : "bg-[var(--color-border)]"
                )}
              />
            );
          })}
        </div>

        <div className="flex gap-4 text-xs text-[var(--color-text-secondary)]">
          <span>🔥 {currentStreak} current</span>
          <span>🏆 {longestStreak} best</span>
          <span>✅ {totalCompletions} total</span>
        </div>
      </div>
    </div>
  );
}
