"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Task, TaskCompletion } from "@/lib/types";

interface TaskItemProps {
  task: Task;
  completion: TaskCompletion | undefined;
  onToggle: (taskId: string, date: string) => void;
  date: string;
  /** True while the toggle operation is in-flight */
  isToggling?: boolean;
}

/**
 * A single row in Today's task list.
 * Shows the task name, a colour indicator, and a completion checkbox.
 * Triggers the toggle callback when the row or checkbox is clicked.
 */
export function TaskItem({
  task,
  completion,
  onToggle,
  date,
  isToggling = false,
}: TaskItemProps) {
  const isCompleted = completion !== undefined;

  return (
    <button
      onClick={() => !isToggling && onToggle(task.id, date)}
      disabled={isToggling}
      aria-pressed={isCompleted}
      aria-label={`${task.name} ΓÇô ${isCompleted ? "completed" : "mark as complete"}`}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-4",
        "bg-[var(--color-surface-raised)] border border-[var(--color-border)]",
        "rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)]",
        "text-left transition-all duration-[var(--transition-fast)]",
        "hover:shadow-[var(--shadow-sm)] active:scale-[0.99]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brand)] focus-visible:outline-offset-2",
        isToggling && "opacity-60 cursor-wait",
        isCompleted && "opacity-80"
      )}
    >
      {/** Colour dot */}
      <span
        className="shrink-0 w-2.5 h-2.5 rounded-[var(--radius-full)]"
        style={{ backgroundColor: task.color }}
        aria-hidden="true"
      />

      {/** Task info */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium text-[var(--color-text-primary)] truncate",
            isCompleted && "line-through text-[var(--color-text-secondary)]"
          )}
        >
          {task.name}
        </p>
        {task.description && (
          <p className="text-xs text-[var(--color-text-disabled)] truncate mt-0.5">
            {task.description}
          </p>
        )}
      </div>

      {/** Checkbox */}
      <span
        className={cn(
          "shrink-0 w-6 h-6 rounded-[var(--radius-md)] border-2 flex items-center justify-center",
          "transition-all duration-[var(--transition-fast)]",
          isCompleted
            ? "border-transparent text-white"
            : "border-[var(--color-border-strong)]"
        )}
        style={isCompleted ? { backgroundColor: task.color } : undefined}
        aria-hidden="true"
      >
        {isCompleted && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}
