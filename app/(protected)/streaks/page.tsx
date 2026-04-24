"use client";

import { useState, useEffect, useCallback } from "react";
import { Flame } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Spinner } from "@/components/ui/spinner";
import { SubTabBar } from "@/components/ui/subtab-bar";
import { StreakCard } from "@/components/streaks/streak-card";
import { ReportsView } from "@/components/streaks/reports-view";
import type { Task, RecordCompletion } from "@/lib/types";
import { buildTaskStreak } from "@/lib/utils/streak";
import { toLocalDateString } from "@/lib/utils/date";

type SubTab = "reports" | "streaks";

const TABS: { id: SubTab; label: string }[] = [
  { id: "reports", label: "Reports" },
  { id: "streaks", label: "Streaks" },
];

/** Streaks page — shows habit reports and per-task streak data */
export default function StreaksPage() {
  const [tasks,       setTasks]       = useState<Task[]>([]);
  const [completions, setCompletions] = useState<RecordCompletion[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [subTab,      setSubTab]      = useState<SubTab>("reports");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, compRes] = await Promise.all([
        fetch("/api/records"),
        fetch("/api/completions"),
      ]);
      if (recRes.ok) {
        const d = await recRes.json();
        setTasks(
          (d.records ?? []).filter(
            (r: Task) => r.kind === "task" && r.is_recurring
          ) as Task[]
        );
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

  const today   = toLocalDateString(new Date());
  const streaks = tasks.map((t) => buildTaskStreak(t, completions, today));

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-0">
      <PageHeader
        title="Streaks"
        accentColor="var(--tab-streaks)"
        className="mb-4"
      />

      <SubTabBar
        tabs={TABS}
        active={subTab}
        onChange={setSubTab}
        accentColor="var(--tab-streaks)"
        className="mb-5"
      />

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
