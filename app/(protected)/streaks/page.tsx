"use client";
import { useState, useEffect, useCallback } from "react";
import { Flame, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Spinner } from "@/components/ui/spinner";
import { StreakCard } from "@/components/streaks/streak-card";
import { ReportsView } from "@/components/streaks/reports-view";
import { cn } from "@/lib/utils/cn";
import type { Task, RecordCompletion } from "@/lib/types";
import { buildTaskStreak } from "@/lib/utils/streak";
import { toLocalDateString } from "@/lib/utils/date";

type SubTab = "reports" | "streaks";

export default function StreaksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<RecordCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>("reports");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, compRes] = await Promise.all([
        fetch("/api/records"),
        fetch("/api/completions"),
      ]);
      if (recRes.ok) {
        const d = await recRes.json();
        const recurring = (d.records ?? []).filter(
          (r: Task) => r.kind === "task" && r.is_recurring
        ) as Task[];
        setTasks(recurring);
      }
      if (compRes.ok) {
        const d = await compRes.json();
        setCompletions(d.completions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = toLocalDateString(new Date());
  const streaks = tasks.map((t) => buildTaskStreak(t, completions, today));

  const TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: "reports", label: "Reports", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "streaks", label: "Streaks", icon: <Flame className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      <PageHeader
        title="Streaks"
        subtitle="Your recurring tasks"
        accentColor="var(--tab-streaks)"
      />

      <div className="flex gap-1 p-1 bg-[var(--color-bg-secondary)] rounded-xl">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all",
              subTab === id
                ? "bg-[var(--color-surface-raised)] text-[var(--tab-streaks)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : subTab === "reports" ? (
        <ReportsView streaks={streaks} today={today} />
      ) : (
        <div className="space-y-3">
          {streaks.length === 0 ? (
            <div className="text-center py-16">
              <Flame className="w-8 h-8 text-[var(--color-text-disabled)] mx-auto mb-3" />
              <p className="text-sm text-[var(--color-text-secondary)]">No recurring tasks yet.</p>
            </div>
          ) : (
            streaks.map((s) => (
              <StreakCard key={s.task.id} streak={s} today={today} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
