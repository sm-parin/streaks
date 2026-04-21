"use client";
import { useState, useEffect, useCallback } from "react";
import { Spinner } from "@/components/ui/spinner";
import { getPerformanceColor, getPerformanceLabel, type GoalWithStreak } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const COLOR_CLASSES: Record<string, string> = {
  red:    "bg-red-500",
  yellow: "bg-yellow-400",
  blue:   "bg-blue-500",
  green:  "bg-green-500",
  orange: "bg-orange-500",
};

const COLOR_TEXT: Record<string, string> = {
  red:    "text-red-500",
  yellow: "text-yellow-500",
  blue:   "text-blue-500",
  green:  "text-green-600",
  orange: "text-orange-500",
};

function RateBar({ rate }: { rate: number }) {
  const color = getPerformanceColor(rate);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-[var(--color-bg-secondary)] overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", COLOR_CLASSES[color])}
          style={{ width: `${Math.round(rate * 100)}%` }} />
      </div>
      <span className={cn("text-xs font-bold w-8 text-right", COLOR_TEXT[color])}>
        {Math.round(rate * 100)}%
      </span>
      <span className="text-xs text-[var(--color-text-secondary)] w-14">{getPerformanceLabel(color)}</span>
    </div>
  );
}

type Period = "week" | "month" | "year";

export function ReportsView() {
  const [period, setPeriod] = useState<Period>("week");
  const [goals, setGoals] = useState<GoalWithStreak[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/goals?streaks=true");
    if (r.ok) { const d = await r.json(); setGoals(d.goals ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getDays = () => period === "week" ? 7 : period === "month" ? 30 : 365;

  const calcRate = (goal: GoalWithStreak) => {
    const days = getDays();
    const today = new Date();
    let scheduled = 0, completed = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (goal.active_days.includes(d.getDay() as 0|1|2|3|4|5|6)) {
        scheduled++;
        const ds = d.toISOString().split("T")[0];
        if (i === 0 ? goal.streak.completed_today : false) completed++;
      }
    }
    if (scheduled === 0) return 0;
    const base = period === "week"
      ? Math.min(goal.streak.current, 7)
      : period === "month"
      ? Math.min(goal.streak.current, 30)
      : goal.streak.total;
    return Math.min(1, base / scheduled);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["week", "month", "year"] as Period[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border capitalize",
              period === p
                ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white"
                : "bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
            )}>
            {p}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner /></div> :
        goals.length === 0 ? (
          <p className="text-center text-[var(--color-text-secondary)] py-12">No goals yet</p>
        ) : (
          <div className="space-y-4">
            {goals.map((g) => {
              const rate = calcRate(g);
              const color = getPerformanceColor(rate);
              return (
                <div key={g.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{g.title}</span>
                    <span className={cn("text-xs font-bold", COLOR_TEXT[color])}>{getPerformanceLabel(color)}</span>
                  </div>
                  <RateBar rate={rate} />
                  <div className="flex gap-4 mt-2 text-xs text-[var(--color-text-secondary)]">
                    <span>Γëí╞Æ├╢├æ {g.streak.current} streak</span>
                    <span>Γëí╞Æ├à├Ñ {g.streak.longest} best</span>
                    <span>╬ô┬ú├┤ {g.streak.total} total</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}
