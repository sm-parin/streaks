"use client";

import { useState, useEffect, useCallback } from "react";
import { Flame } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Spinner } from "@/components/ui/spinner";
import { SubTabBar } from "@/components/ui/subtab-bar";
import { StreakCard } from "@/components/streaks/streak-card";
import { ReportsView } from "@/components/streaks/reports-view";
import { createClient } from "@/lib/supabase/client";
import { useStreaks } from "@/lib/hooks/use-streaks";
import type { StreakResult } from "@/lib/types";

type SubTab = "reports" | "streaks";

const TABS: { id: SubTab; label: string }[] = [
  { id: "reports", label: "Reports" },
  { id: "streaks", label: "Streaks" },
];

export default function StreaksPage() {
  const { streaks, isLoading, error, refresh } = useStreaks();
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [subTab, setSubTab] = useState<SubTab>("reports");

  const fetchTitles = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("is_recurring", true)
      .not("status", "eq", "rejected");
    if (data) {
      setTitles(Object.fromEntries(data.map((t: { id: string; title: string }) => [t.id, t.title])));
    }
  }, []);

  useEffect(() => {
    fetchTitles();
    refresh();
  }, [fetchTitles, refresh]);

  const paired = streaks.map((r: StreakResult) => ({
    result: r,
    title: titles[r.task_id] ?? "…",
  }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-0">
      <PageHeader title="Streaks" accentColor="var(--tab-streaks)" className="mb-4" />
      <SubTabBar tabs={TABS} active={subTab} onChange={setSubTab} accentColor="var(--tab-streaks)" className="mb-5" />
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error ? (
        <p className="text-center text-sm text-red-500 py-8">{error}</p>
      ) : subTab === "reports" ? (
        <ReportsView streaks={paired} />
      ) : (
        <div className="space-y-3">
          {paired.length === 0 ? (
            <div className="text-center py-16">
              <Flame className="w-8 h-8 text-[var(--color-text-disabled)] mx-auto mb-3" />
              <p className="text-sm text-[var(--color-text-secondary)]">No recurring tasks yet.</p>
            </div>
          ) : (
            paired.map(({ result, title }) => (
              <StreakCard key={result.task_id} streak={result} title={title} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
