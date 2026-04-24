"use client";
import { useState, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { type List, type Task, PRIORITY_COLORS } from "@/lib/types";
import { RecordCard } from "./record-card";

interface ListCardProps {
  list: List & { tasks: Task[] };
  completedIds?: Set<string>;
  tags?: { id: string; name: string; color: string }[];
  onTaskClick?: (task: Task) => void;
  onTaskDoubleClick?: (task: Task) => void;
  onListClick?: () => void;
  onListDoubleClick?: () => void;
  className?: string;
}

export function ListCard({
  list,
  completedIds = new Set(),
  tags = [],
  onTaskClick,
  onTaskDoubleClick,
  onListClick,
  onListDoubleClick,
  className,
}: ListCardProps) {
  const [expanded, setExpanded] = useState(false);
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tasks = list.tasks ?? [];
  const taskCount = tasks.length;
  const completedCount = tasks.filter(
    (t) => completedIds.has(t.id) || t.status === "completed"
  ).length;

  const firstTask = tasks[0];
  const priorityColor = firstTask
    ? PRIORITY_COLORS[firstTask.priority]
    : PRIORITY_COLORS[3];

  const handleHeaderClick = () => {
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      if (clickCount.current === 1) {
        setExpanded((v) => !v);
        onListClick?.();
      } else if (clickCount.current >= 2) {
        onListDoubleClick?.();
      }
      clickCount.current = 0;
    }, 220);
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const aComp = completedIds.has(a.id) || a.status === "completed" ? 1 : 0;
    const bComp = completedIds.has(b.id) || b.status === "completed" ? 1 : 0;
    return aComp - bComp;
  });

  return (
    <div className={cn("relative", className)}>
      {/* Stack shadows (deck-of-cards effect) */}
      {taskCount > 2 && (
        <div
          className="absolute inset-x-3 top-2 h-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
          style={{ zIndex: -2 }}
          aria-hidden="true"
        />
      )}
      {taskCount > 1 && (
        <div
          className="absolute inset-x-1.5 top-1 h-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)]"
          style={{ zIndex: -1, opacity: 0.8 }}
          aria-hidden="true"
        />
      )}

      {/* Main list card */}
      <div className="relative z-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] overflow-hidden">
        {/* Priority strip */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5"
          style={{ backgroundColor: priorityColor }}
          aria-hidden="true"
        />

        {/* List header */}
        <button
          onClick={handleHeaderClick}
          className="w-full flex items-center justify-between pl-5 pr-3 py-3 text-left hover:bg-[var(--color-bg-secondary)] transition-colors"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
              {list.title}
            </span>
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
              {completedCount}/{taskCount}
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
          )}
        </button>

        {/* Expanded tasks */}
        {expanded && (
          <div className="border-t border-[var(--color-border)] max-h-80 overflow-y-auto">
            {sortedTasks.length === 0 ? (
              <p className="px-5 py-3 text-xs text-[var(--color-text-secondary)] italic">
                No tasks in this list
              </p>
            ) : (
              <div className="px-2 py-2 space-y-1.5">
                {sortedTasks.map((task) => (
                  <RecordCard
                    key={task.id}
                    task={task}
                    completedToday={completedIds.has(task.id)}
                    tags={tags}
                    onClick={() => onTaskClick?.(task)}
                    onDoubleClick={() => onTaskDoubleClick?.(task)}
                    className="ml-2"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
