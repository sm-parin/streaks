"use client";
import { cn } from "@/lib/utils/cn";
import type { StreakResult } from "@/lib/types";

interface Props {
  streaks: { result: StreakResult; title: string }[];
}

function completionRate(streak: StreakResult): number {
  const scheduled = streak.recentDays.filter((d) => d.status !== "not_scheduled");
  if (scheduled.length === 0) return streak.completedToday ? 1 : 0;
  const done = scheduled.filter((d) => d.status === "completed" || d.status === "grace");
  return done.length / scheduled.length;
}

function RateBar({ rate }: { rate: number }) {
  const color =
    rate >= 0.8 ? "bg-[var(--priority-5)]"
    : rate >= 0.5 ? "bg-[var(--priority-3)]"
    : "bg-[var(--priority-1)]";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-[var(--color-bg-secondary)] overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.round(rate * 100)}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums w-8 text-right text-[var(--color-text-secondary)]">
        {Math.round(rate * 100)}%
      </span>
    </div>
  );
}

export function ReportsView({ streaks }: Props) {
  return (
    <div className="space-y-3">
      {streaks.length === 0 ? (
        <p className="text-center text-sm text-[var(--color-text-secondary)] py-10">
          No recurring tasks to report on.
        </p>
      ) : (
        streaks.map(({ result, title }) => {
          const rate = completionRate(result);
          return (
            <div
              key={result.task_id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 space-y-2"
            >
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
              <RateBar rate={rate} />
              <p className="text-xs text-[var(--color-text-disabled)]">Based on last 14 days</p>
            </div>
          );
        })
      )}
    </div>
  );
}
