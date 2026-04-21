"use client";
import { useState, useEffect, useCallback } from "react";
import { Flame, Plus, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StreakCard } from "@/components/streaks/streak-card";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { ReportsView } from "@/components/streaks/reports-view";
import { TAB_COLORS } from "@/lib/types";
import type { GoalWithStreak } from "@/lib/types";

export default function StreaksPage() {
  const [goals, setGoals] = useState<GoalWithStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/goals?streaks=true&active=true");
    if (r.ok) { const d = await r.json(); setGoals(d.goals ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  return (
    <div>
      <PageHeader
        title="Streaks"
        subtitle="Your recurring goals"
        accentColor={TAB_COLORS.streaks}
        right={
          <Button size="sm" onClick={() => setShowForm(true)} leftIcon={<Plus className="w-4 h-4" />}>
            New Goal
          </Button>
        }
      />

      <Tabs defaultValue="streaks">
        <TabsList className="mb-4">
          <TabsTrigger value="streaks"><Flame className="w-3.5 h-3.5 mr-1.5" />Streaks</TabsTrigger>
          <TabsTrigger value="reports"><TrendingUp className="w-3.5 h-3.5 mr-1.5" />Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="streaks">
          {loading ? (
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
          )}
        </TabsContent>

        <TabsContent value="reports">
          <ReportsView />
        </TabsContent>
      </Tabs>

      {showForm && (
        <GoalFormDialog
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchGoals(); }}
        />
      )}
    </div>
  );
}
