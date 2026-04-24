"use client";

import { useRef } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { type Task, PRIORITY_COLORS, DAY_LABELS } from "@/lib/types";

interface RecordCardProps {
  task: Task;
  completedToday?: boolean;
  tags?: { id: string; name: string; color: string }[];
  /** Called on single tap / click */
  onClick?: () => void;
  /** Called on double tap / double click — typically opens edit */
  onDoubleClick?: () => void;
  /**
   * Desktop-only: shown as an icon button on hover (right side of the card).
   * Typically maps to the swipe-right complete action.
   */
  onComplete?: () => void;
  /**
   * Desktop-only: shown as an icon button on hover (right side of the card).
   * Typically maps to the swipe-left delete action.
   */
  onDelete?: () => void;
  className?: string;
}

/**
 * Card representing a single task (record of kind = 'task').
 *
 * Layout:
 *  [priority strip | content | (hover) action icons]
 *
 * On mobile: action icons are hidden; swipe gestures handle complete/delete.
 * On desktop: compact icon buttons slide in from the right on hover and sit
 *   WITHIN allocated space — content gets slightly narrower, no overlap.
 */
export function RecordCard({
  task,
  completedToday,
  tags = [],
  onClick,
  onDoubleClick,
  onComplete,
  onDelete,
  className,
}: RecordCardProps) {
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCompleted =
    completedToday || (!task.is_recurring && task.status === "completed");

  /** Distinguishes single click from double click with a 220 ms window */
  const handleClick = () => {
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      if (clickCount.current === 1)    onClick?.();
      else if (clickCount.current >= 2) onDoubleClick?.();
      clickCount.current = 0;
    }, 220);
  };

  const priorityColor = PRIORITY_COLORS[task.priority];
  const taskTags      = tags.filter((t) => task.tag_ids?.includes(t.id));

  const scheduleSummary = task.is_recurring
    ? (task.active_days ?? [])
        .sort((a, b) => a - b)
        .map((d) => DAY_LABELS[d].slice(0, 2))
        .join(" ")
    : task.specific_date
    ? new Date(task.specific_date + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day:   "numeric",
      })
    : "";

  const timeRange =
    task.time_from
      ? `${task.time_from.slice(0, 5)}${task.time_to ? ` – ${task.time_to.slice(0, 5)}` : ""}`
      : "";

  const hasActions = !!(onComplete || onDelete);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={cn(
        "group relative flex overflow-hidden rounded-lg border border-[var(--color-border)]",
        "bg-[var(--color-surface-raised)] select-none cursor-pointer",
        "hover:border-[var(--color-border-strong)] transition-colors duration-[var(--transition-fast)]",
        isCompleted && "opacity-55",
        className
      )}
    >
      {/* Priority strip */}
      <div
        className="w-1 shrink-0"
        style={{ backgroundColor: priorityColor }}
        aria-label={`Priority ${task.priority}`}
      />

      {/* Content — narrows on desktop hover to make room for action icons */}
      <div
        className={cn(
          "flex-1 min-w-0 px-3 py-2.5 space-y-1 transition-[padding-right] duration-[var(--transition-fast)]",
          hasActions && "md:group-hover:pr-16"
        )}
      >
        {/* Row 1: Title + schedule */}
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium text-[var(--color-text-primary)] leading-snug flex-1 min-w-0",
              isCompleted && "line-through text-[var(--color-text-disabled)]"
            )}
          >
            {task.title}
          </p>
          {scheduleSummary && (
            <span className="text-[11px] text-[var(--color-text-disabled)] whitespace-nowrap shrink-0 pt-px">
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
              <span className="text-[11px] text-[var(--color-text-disabled)] shrink-0 whitespace-nowrap">
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
                className="text-[10px] px-1.5 py-px rounded-sm font-medium"
                style={{ backgroundColor: tag.color + "1A", color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Desktop hover action icons — slide in from right, sit in allocated space */}
      {hasActions && (
        <div
          className={cn(
            "absolute right-0 inset-y-0 hidden md:flex items-center gap-0.5 px-2",
            "opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0",
            "transition-all duration-[var(--transition-fast)] pointer-events-none group-hover:pointer-events-auto"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {onComplete && (
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              aria-label="Complete"
              title="Mark complete"
              className="p-1.5 rounded-md text-[var(--color-success)] hover:bg-[var(--color-success-bg)] transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              aria-label="Delete"
              title="Delete"
              className="p-1.5 rounded-md text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
