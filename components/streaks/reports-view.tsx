"use client";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { TaskStreak } from "@/lib/utils/streak";
import type { DayOfWeek } from "@/lib/types";

interface Props {
  streaks: TaskStreak[];
  today: string;
}

type Period = "today" | "week" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  week:  "This Week",
  month: "This Month",
  year:  "This Year",
};

function completionRate(streak: TaskStreak, daysBack: number): number {
  if (daysBack === 0) return streak.completedToday ? 1 : 0;
  const today = new Date();
  let scheduled = 0;
  let completed = 0;
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (!streak.task.active_days?.includes(dow as DayOfWeek)) continue;
    scheduled++;
    const dateStr = d.toISOString().split("T")[0];
    if (streak.completions.some((c) => c.completed_date === dateStr)) completed++;
  }
  return scheduled === 0 ? 0 : completed / scheduled;
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
  const [period, setPeriod] = useState<Period>("today");

  const daysBack: Record<Period, number> = { today: 0, week: 7, month: 30, year: 365 };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors",
              period === p
                ? "border-[var(--tab-streaks)] text-white"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
            )}
            style={period === p ? { backgroundColor: "var(--tab-streaks)" } : {}}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {streaks.length === 0 ? (
        <p className="text-center text-sm text-[var(--color-text-secondary)] py-10">
          No recurring tasks to report on.
        </p>
      ) : (
        <div className="space-y-3">
          {streaks.map((s) => {
            const rate = completionRate(s, daysBack[period]);
            return (
              <div
                key={s.task.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 space-y-2"
              >
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {s.task.title}
                </p>
                <RateBar rate={rate} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
