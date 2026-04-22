"use client";
import { useState, useEffect, useCallback } from "react";
import { Flame, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Spinner } from "@/components/ui/spinner";
import { StreakCard } from "@/components/streaks/streak-card";
import { ReportsView } from "@/components/streaks/reports-view";
import { TAB_COLORS } from "@/lib/types";
import type { GoalWithStreak } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type SubTab = "streaks" | "reports";

export default function StreaksPage() {
  const [goals, setGoals] = useState<GoalWithStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>("streaks");

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/goals?streaks=true&active=true");
    if (r.ok) { const d = await r.json(); setGoals(d.goals ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const TABS: { id: SubTab; icon: React.ReactNode; label: string }[] = [
    { id: "streaks", icon: <Flame className="w-4 h-4" />, label: "Streaks" },
    { id: "reports", icon: <TrendingUp className="w-4 h-4" />, label: "Reports" },
  ];

  return (
    <div>
      <PageHeader
        title="Streaks"
        subtitle="Your recurring goals"
        accentColor={TAB_COLORS.streaks}
      />

      {/* Sub-tabs â€” underline style */}
      <div className="flex border-b border-[var(--color-border)] mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              subTab === t.id
                ? "border-[var(--color-brand)] text-[var(--color-brand)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "streaks" && (
        loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-text-secondary)]">
            <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No active goals</p>
            <p className="text-sm mt-1">Create your first goal to start a streak</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => (
              <StreakCard key={g.id} goal={g} onUpdate={fetchGoals} />
            ))}
          </div>
        )
      )}

      {subTab === "reports" && <ReportsView />}
    </div>
  );
}

