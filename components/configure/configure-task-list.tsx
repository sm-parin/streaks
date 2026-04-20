"use client";

import { useState } from "react";
import { Pencil, Trash2, Power } from "lucide-react";
import { useTasks } from "@/lib/hooks/use-tasks";
import { TaskForm } from "./task-form";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { DAY_NAMES_SHORT } from "@/lib/utils/date";
import type { Task, TaskFormData } from "@/lib/types";

/**
 * Displays all tasks (active and paused) with options to:
 * - Toggle active/paused state
 * - Edit via an inline dialog
 * - Delete (with a confirmation step)
 */
export function ConfigureTaskList() {
  const { tasks, loading, createTask, updateTask, toggleTaskActive, deleteTask } =
    useTasks();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async (data: TaskFormData) => createTask(data);

  const handleUpdate = async (data: TaskFormData) => {
    if (!editTarget) return false;
    return updateTask(editTarget.id, data);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteTask(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[84px] rounded-[var(--radius-xl)]" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/** Add task button */}
      <Button
        fullWidth
        variant="outline"
        onClick={() => setAddOpen(true)}
        leftIcon={
          <span className="text-base leading-none" aria-hidden="true">
            +
          </span>
        }
        className="mb-4"
      >
        Add Task
      </Button>

      {/** Task list */}
      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--color-text-secondary)]">No tasks yet.</p>
          <p className="text-sm text-[var(--color-text-disabled)] mt-1">
            Tap "Add Task" to create your first habit.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onEdit={() => setEditTarget(task)}
              onDelete={() => setDeleteTarget(task)}
              onToggleActive={() => toggleTaskActive(task.id, task.is_active)}
            />
          ))}
        </div>
      )}

      {/** Add Task dialog */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="New Task"
      >
        <TaskForm
          onSubmit={handleCreate}
          onCancel={() => setAddOpen(false)}
          submitLabel="Create"
        />
      </Dialog>

      {/** Edit Task dialog */}
      <Dialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Task"
      >
        {editTarget && (
          <TaskForm
            initialData={editTarget}
            onSubmit={handleUpdate}
            onCancel={() => setEditTarget(null)}
            submitLabel="Update"
          />
        )}
      </Dialog>

      {/** Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Task"
      >
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          Permanently delete{" "}
          <strong className="text-[var(--color-text-primary)]">
            {deleteTarget?.name}
          </strong>{" "}
          and all its completion history? This cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            fullWidth
            loading={deleting}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  );
}

// ΓöÇΓöÇΓöÇ Private sub-component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface TaskRowProps {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

/**
 * A single task row in the configure list showing the task's colour, name,
 * scheduled days, and action buttons.
 */
function TaskRow({ task, onEdit, onDelete, onToggleActive }: TaskRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        "bg-[var(--color-surface-raised)] border border-[var(--color-border)]",
        "rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)]",
        !task.is_active && "opacity-50"
      )}
    >
      {/** Colour dot */}
      <span
        className="shrink-0 w-3 h-3 rounded-[var(--radius-full)]"
        style={{ backgroundColor: task.color }}
        aria-hidden="true"
      />

      {/** Task info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
          {task.name}
        </p>
        <div className="flex flex-wrap gap-1 mt-1">
          {task.active_days.map((d) => (
            <Badge key={d} variant="default" className="text-[9px] px-1.5 py-0">
              {DAY_NAMES_SHORT[d]}
            </Badge>
          ))}
          {!task.is_active && (
            <Badge variant="warning" className="text-[9px] px-1.5 py-0">
              Paused
            </Badge>
          )}
        </div>
      </div>

      {/** Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <IconButton
          onClick={onToggleActive}
          aria-label={task.is_active ? "Pause task" : "Resume task"}
          title={task.is_active ? "Pause" : "Resume"}
        >
          <Power className="w-3.5 h-3.5" />
        </IconButton>
        <IconButton onClick={onEdit} aria-label="Edit task" title="Edit">
          <Pencil className="w-3.5 h-3.5" />
        </IconButton>
        <IconButton
          onClick={onDelete}
          aria-label="Delete task"
          title="Delete"
          className="text-[var(--color-error)] hover:bg-[var(--color-error-bg)]"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)]",
        "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]",
        "transition-colors duration-[var(--transition-fast)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brand)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
