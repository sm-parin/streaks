"use client";
import { useState } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Flame, Activity, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PRIORITY_COLORS, PRIORITY_LABELS, TAB_COLORS } from "@/lib/types";
import type { GoalWithStreak, Activity as ActivityType } from "@/lib/types";
import { SubRecordsList } from "@/components/records/sub-records-list";

type GoalItem  = { type: "goal";     goal: GoalWithStreak; activity?: never; onUpdate: () => void; };
type ActItem   = { type: "activity"; goal?: never; activity: ActivityType; onUpdate: () => void; };
type Props = GoalItem | ActItem;

export function TodayRecordItem({ type, goal, activity, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const isGoal = type === "goal";

  const isCompleted = isGoal
    ? goal!.streak.completed_today
    : activity!.status === "completed";

  const title = isGoal ? goal!.title : activity!.title;
  const desc  = isGoal ? goal!.description : activity!.description;
  const pri   = isGoal ? goal!.priority : activity!.priority;
  const id    = isGoal ? goal!.id : activity!.id;

  const accentColor = isGoal ? TAB_COLORS.today :
    activity?.group_id ? "#2563EB" : TAB_COLORS.records;

  const toggle = async () => {
    setToggling(true);
    if (isGoal) {
      await fetch(`/api/goals/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      });
    } else {
      await fetch(`/api/activities/${id}`, { method: "POST" });
    }
    onUpdate();
    setToggling(false);
  };

  return (
    <div className={cn(
      "bg-[var(--color-surface)] border rounded-[var(--radius-lg)] transition-all overflow-hidden",
      isCompleted ? "border-[var(--color-success)] opacity-70" : "border-[var(--color-border)]"
    )}>
      <div className="flex items-start gap-3 p-3 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <button
          onClick={(e) => { e.stopPropagation(); toggle(); }}
          disabled={toggling}
          className="mt-0.5 shrink-0"
          aria-label="Toggle"
        >
          {isCompleted
            ? <CheckCircle2 className="w-5 h-5 text-[var(--color-success)]" />
            : <Circle className="w-5 h-5" style={{ color: accentColor }} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isGoal
              ? <Flame className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
              : <Activity className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />}
            <span className={cn("text-sm font-semibold text-[var(--color-text-primary)] truncate", isCompleted && "line-through")}>
              {title}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
              style={{ backgroundColor: PRIORITY_COLORS[pri] + "22", color: PRIORITY_COLORS[pri] }}>
              P{pri}
            </span>
          </div>
          {!isGoal && activity?.activity_time && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-[var(--color-text-secondary)]">
              <Clock className="w-3 h-3" />{activity.activity_time}
            </div>
          )}
          {isGoal && (
            <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: accentColor }}>
              Γëí╞Æ├╢├æ {goal!.streak.current} day streak
            </div>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[var(--color-text-disabled)] shrink-0" />
          : <ChevronDown className="w-4 h-4 text-[var(--color-text-disabled)] shrink-0" />}
      </div>

      {expanded && (
        <div className="px-4 pb-3 border-t border-[var(--color-border)] pt-3 space-y-3">
          {desc && <p className="text-sm text-[var(--color-text-secondary)]">{desc}</p>}
          <div className="flex items-center gap-3 flex-wrap text-xs text-[var(--color-text-secondary)]">
            <span className="font-medium" style={{ color: PRIORITY_COLORS[pri] }}>
              {PRIORITY_LABELS[pri]} Priority
            </span>
            {!isGoal && activity?.creator_username && activity.creator_username !== activity.assignee_user_id && (
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                From @{activity.creator_username}
              </span>
            )}
          </div>
          <SubRecordsList
            goalId={isGoal ? id : undefined}
            activityId={!isGoal ? id : undefined}
          />
        </div>
      )}
    </div>
  );
}
