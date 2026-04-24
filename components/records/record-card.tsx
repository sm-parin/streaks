"use client";
import { useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { type Task, PRIORITY_COLORS, DAY_LABELS } from "@/lib/types";

interface RecordCardProps {
  task: Task;
  completedToday?: boolean;
  tags?: { id: string; name: string; color: string }[];
  onClick?: () => void;
  onDoubleClick?: () => void;
  className?: string;
}

export function RecordCard({
  task,
  completedToday,
  tags = [],
  onClick,
  onDoubleClick,
  className,
}: RecordCardProps) {
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCompleted =
    completedToday || (!task.is_recurring && task.status === "completed");

  const handleClick = () => {
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      if (clickCount.current === 1) onClick?.();
      else if (clickCount.current >= 2) onDoubleClick?.();
      clickCount.current = 0;
    }, 220);
  };

  const priorityColor = PRIORITY_COLORS[task.priority];
  const taskTags = tags.filter((t) => task.tag_ids?.includes(t.id));

  const scheduleSummary = task.is_recurring
    ? (task.active_days ?? [])
        .sort((a, b) => a - b)
        .map((d) => DAY_LABELS[d])
        .join(" ")
    : task.specific_date
    ? new Date(task.specific_date + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "";

  const timeRange =
    task.time_from
      ? `${task.time_from.slice(0, 5)}${task.time_to ? ` - ${task.time_to.slice(0, 5)}` : ""}`
      : "";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={cn(
        "relative flex overflow-hidden rounded-xl border border-[var(--color-border)]",
        "bg-[var(--color-surface-raised)] select-none cursor-pointer",
        "hover:border-[var(--color-border-strong)] transition-colors",
        isCompleted && "opacity-60",
        className
      )}
    >
      {/* Priority strip */}
      <div
        className="w-1.5 shrink-0 rounded-l-xl"
        style={{ backgroundColor: priorityColor }}
        aria-label={`Priority ${task.priority}`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 px-3 py-2.5 space-y-1">
        {/* Row 1: Title + schedule */}
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium text-[var(--color-text-primary)] leading-tight flex-1 min-w-0",
              isCompleted && "line-through text-[var(--color-text-disabled)]"
            )}
          >
            {task.title}
          </p>
          {scheduleSummary && (
            <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap shrink-0">
              {scheduleSummary}
            </span>
          )}
        </div>

        {/* Row 2: Description + time */}
        {(task.description || timeRange) && (
          <div className="flex items-center justify-between gap-2">
            {task.description ? (
              <p className="text-xs text-[var(--color-text-secondary)] truncate flex-1 min-w-0">
                {task.description}
              </p>
            ) : <span />}
            {timeRange && (
              <span className="text-xs text-[var(--color-text-secondary)] shrink-0 whitespace-nowrap">
                {timeRange}
              </span>
            )}
          </div>
        )}

        {/* Row 3: Tags */}
        {taskTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {taskTags.map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: tag.color + "22", color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Row 4: Social attribution */}
        {(task.assigner_user_id || task.assignee_user_id) && (
          <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)]">
            {task.assigner_user_id && task.assigner_user_id !== task.user_id && (
              <span>From someone</span>
            )}
            {task.assignee_user_id && task.assignee_user_id !== task.user_id && (
              <span>Shared</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
