"use client";
import { useState, useEffect, useCallback } from "react";
import { Flame, Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { StreakCard } from "@/components/streaks/streak-card";
import type { GoalWithStreak } from "@/lib/types";

export function GoalsList({ onAddNew }: { onAddNew: () => void }) {
  const [goals, setGoals] = useState<GoalWithStreak[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/goals?streaks=true");
    if (r.ok) { const d = await r.json(); setGoals(d.goals ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  if (!goals.length) return (
    <div className="text-center py-12 text-[var(--color-text-secondary)]">
      <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-medium">No goals yet</p>
      <Button size="sm" className="mt-3" onClick={onAddNew} leftIcon={<Plus className="w-4 h-4" />}>Add Goal</Button>
    </div>
  );

  return <div className="space-y-3">{goals.map((g) => <StreakCard key={g.id} goal={g} onUpdate={load} />)}</div>;
}
