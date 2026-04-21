"use client";
import { useState } from "react";
import { Flame, CheckCircle2, Circle, MoreHorizontal, Pause, Play, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PRIORITY_COLORS, DAY_LABELS } from "@/lib/types";
import type { GoalWithStreak } from "@/lib/types";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";

interface Props { goal: GoalWithStreak; onUpdate: () => void; }

export function StreakCard({ goal, onUpdate }: Props) {
  const [toggling, setToggling] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const isCompleted = goal.streak.completed_today;

  const toggle = async () => {
    setToggling(true);
    await fetch(`/api/goals/${goal.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today }),
    });
    onUpdate();
    setToggling(false);
  };

  const toggleActive = async () => {
    await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !goal.is_active }),
    });
    onUpdate();
  };

  const deleteGoal = async () => {
    if (!confirm("Delete this goal and all its streak history?")) return;
    await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
    onUpdate();
  };

  return (
    <>
      <div className={cn(
        "bg-[var(--color-surface)] border rounded-[var(--radius-lg)] p-4 transition-all",
        isCompleted ? "border-[var(--color-success)] bg-[var(--color-success-bg)]" : "border-[var(--color-border)]"
      )}>
        <div className="flex items-start gap-3">
          <button onClick={toggle} disabled={toggling} className="mt-0.5 shrink-0" aria-label="Toggle completion">
            {isCompleted
              ? <CheckCircle2 className="w-5 h-5 text-[var(--color-success)]" />
              : <Circle className="w-5 h-5 text-[var(--color-text-disabled)]" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{goal.title}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: PRIORITY_COLORS[goal.priority] + "22", color: PRIORITY_COLORS[goal.priority] }}>
                P{goal.priority}
              </span>
            </div>

            {goal.description && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">{goal.description}</p>
            )}

            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-[var(--color-brand)]" />
                <span className="text-xs font-bold text-[var(--color-brand)]">{goal.streak.current}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">streak</span>
              </div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                Best: <span className="font-medium text-[var(--color-text-primary)]">{goal.streak.longest}</span>
              </div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                Total: <span className="font-medium text-[var(--color-text-primary)]">{goal.streak.total}</span>
              </div>
            </div>

            <div className="flex gap-1 mt-2">
              {[0,1,2,3,4,5,6].map((d) => (
                <span key={d} className={cn(
                  "text-[9px] px-1 py-0.5 rounded",
                  goal.active_days.includes(d as 0|1|2|3|4|5|6)
                    ? "bg-[var(--color-brand)] text-white font-semibold"
                    : "bg-[var(--color-bg-secondary)] text-[var(--color-text-disabled)]"
                )}>
                  {DAY_LABELS[d]}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="p-1 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-6 w-36 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-md z-10 py-1" onMouseLeave={() => setMenuOpen(false)}>
                <button onClick={() => { setEditing(true); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => { toggleActive(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]">
                  {goal.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {goal.is_active ? "Pause" : "Resume"}
                </button>
                <button onClick={() => { deleteGoal(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[var(--color-error)] hover:bg-[var(--color-error-bg)]">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {editing && (
        <GoalFormDialog goal={goal} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onUpdate(); }} />
      )}
    </>
  );
}
