"use client";

import { type Task } from "@/lib/types";
import { TaskCard } from "@/components/tasks/task-card";

interface BacklogSectionProps {
  tasks: Task[];
  completedIds: Set<string>;
  onTap: (taskId: string) => void;
  onDoubleTap: (task: Task) => void;
}

/**
 * Renders global tasks (no deadline) at the bottom of the Today view
 * under a "Backlog" heading. Tap = complete, double-tap = info.
 */
export function BacklogSection({ tasks, completedIds, onTap, onDoubleTap }: BacklogSectionProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] px-1">
        Backlog
      </p>
      {tasks.map((task) => {
        const isDone = completedIds.has(task.id) || task.status === "completed";
        return (
          <TaskCard
            key={task.id}
            task={task}
            completedToday={isDone}
            showDays={false}
            onClick={() => onTap(task.id)}
            onDoubleClick={() => onDoubleTap(task)}
          />
        );
      })}
    </div>
  );
}
