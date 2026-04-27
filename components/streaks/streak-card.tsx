"use client";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { StreakResult, DayStatus } from "@/lib/types";

interface Props {
  streak: StreakResult;
  title: string;
}

const DOT_CLASSES: Record<DayStatus, string> = {
  completed:     "w-2.5 h-2.5 rounded-full bg-[var(--tab-streaks)]",
  grace:         "w-2.5 h-2.5 rounded-full border-2 border-amber-400 bg-transparent",
  missed:        "w-2.5 h-2.5 rounded-full bg-[var(--color-border)] opacity-40",
  not_scheduled: "w-1 h-1 rounded-full bg-[var(--color-border)] opacity-20",
};

export function StreakCard({ streak, title }: Props) {
  const { currentStreak, longestStreak, totalCompletions, completedToday, recentDays } = streak;

  return (
    <div className="flex overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
      <div className="flex-1 px-3 py-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight">
            {title}
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

        <div className="flex items-center gap-1" aria-label="Last 14 days">
          {recentDays.map(({ date, status }) => (
            <div key={date} className="flex-1 flex justify-center" title={`${date}: ${status}`}>
              <div className={DOT_CLASSES[status]} />
            </div>
          ))}
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
