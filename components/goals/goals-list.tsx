"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Flame, Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { StreakCard } from "@/components/streaks/streak-card";
import type { GoalWithStreak } from "@/lib/types";
import type { SortDir } from "@/components/layout/search-filter-bar";

export function GoalsList({ onAddNew, search = "", sortDir = "asc", onHasData }: {
  onAddNew: () => void;
  search?: string;
  sortDir?: SortDir;
  onHasData?: (has: boolean) => void;
}) {
  const [goals, setGoals] = useState<GoalWithStreak[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/goals?streaks=true");
    if (r.ok) { const d = await r.json(); const list = d.goals ?? []; setGoals(list); onHasData?.(list.length > 0); }
    setLoading(false);
  }, [onHasData]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = goals;
    if (search) list = list.filter((g) => g.title.toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a, b) =>
      sortDir === "asc" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
    );
  }, [goals, search, sortDir]);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  if (!filtered.length) return (
    <div className="text-center py-12 text-[var(--color-text-secondary)]">
      <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-medium">{search ? "No goals match your search" : "No goals yet"}</p>
      {!search && <Button size="sm" className="mt-3" onClick={onAddNew} leftIcon={<Plus className="w-4 h-4" />}>Add Goal</Button>}
    </div>
  );

  return <div className="space-y-3">{filtered.map((g) => <StreakCard key={g.id} goal={g} onUpdate={load} />)}</div>;
}
