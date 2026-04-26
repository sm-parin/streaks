"use client";

import { useState, useEffect, useCallback } from "react";
import { Flame } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Spinner } from "@/components/ui/spinner";
import { SubTabBar } from "@/components/ui/subtab-bar";
import { StreakCard } from "@/components/streaks/streak-card";
import { ReportsView } from "@/components/streaks/reports-view";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskCompletion } from "@/lib/types";
import { buildTaskStreak } from "@/lib/utils/streak";
import { toLocalDateString } from "@/lib/utils/date";

type SubTab = "reports" | "streaks";

const TABS: { id: SubTab; label: string }[] = [
  { id: "reports", label: "Reports" },
  { id: "streaks", label: "Streaks" },
];

export default function StreaksPage() {
  const [tasks,       setTasks]       = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [subTab,      setSubTab]      = useState<SubTab>("reports");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: taskRows }, { data: compRows }] = await Promise.all([
      supabase.from("tasks").select("*").eq("is_recurring", true).not("status", "eq", "rejected"),
      supabase.from("task_completions").select("*").order("completed_date", { ascending: false }),
    ]);
    setTasks((taskRows ?? []) as Task[]);
    setCompletions((compRows ?? []) as TaskCompletion[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today   = toLocalDateString(new Date());
  const streaks = tasks.map((t) => buildTaskStreak(t, completions, today));

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-0">
      <PageHeader title="Streaks" accentColor="var(--tab-streaks)" className="mb-4" />
      <SubTabBar tabs={TABS} active={subTab} onChange={setSubTab} accentColor="var(--tab-streaks)" className="mb-5" />
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
            streaks.map((s) => <StreakCard key={s.task.id} streak={s} today={today} />)
          )}
        </div>
      )}
    </div>
  );
}
