"use client";

import type { Task, StreakResult } from "@/lib/types";

function getGreeting(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

interface MorningBriefProps {
  username: string;
  todayTotal: number;
  completedIds: Set<string>;
  streaks: StreakResult[];
  tasks: Task[];
}

export function MorningBrief({ username, todayTotal, completedIds, streaks, tasks }: MorningBriefProps) {
  if (completedIds.size > 0 || todayTotal === 0) return null;

  const atRiskStreak = streaks.find((s) => s.currentStreak > 7 && !completedIds.has(s.task_id));
  const atRiskTask = atRiskStreak ? tasks.find((t) => t.id === atRiskStreak.task_id) : null;

  return (
    <div className="rounded-xl bg-[var(--color-surface-raised)] px-4 py-3 space-y-1 mb-3">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
        Good {getGreeting()}, @{username}
      </p>
      <p className="text-xs text-[var(--color-text-secondary)]">
        {todayTotal} habit{todayTotal === 1 ? "" : "s"} today
      </p>
      {atRiskStreak && atRiskTask && (
        <p className="text-xs text-[#EF4444] pt-0.5">
          Your {atRiskStreak.currentStreak}-day streak on &apos;{atRiskTask.title}&apos; is waiting.
        </p>
      )}
    </div>
  );
}
