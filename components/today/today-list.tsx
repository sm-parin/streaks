"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { useToday } from "@/lib/hooks/use-today";
import { useTags } from "@/lib/hooks/use-tags";
import { type Task, type List } from "@/lib/types";
import { SwipeableWrapper } from "@/components/records/swipeable-wrapper";
import { RecordCard } from "@/components/records/record-card";
import { ListCard } from "@/components/records/list-card";
import { RCM } from "@/components/records/rcm";

/**
 * Main view for the Today tab.
 *
 * Renders lists first, then standalone tasks. Completed tasks are sorted to
 * the bottom of their section — no separate "Completed" heading is shown.
 * Swipe right to complete, swipe left to undo.
 */
export function TodayList() {
  const { tasks, completedIds, lists, loading, error, refresh, toggleComplete } = useToday();
  const { tags } = useTags();
  const [infoTask, setInfoTask] = useState<Task | null>(null);

  useEffect(() => { refresh(); }, [refresh]);

  const today     = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-secondary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-[var(--color-text-secondary)]">
        <p className="text-sm mb-3">{error}</p>
        <button onClick={refresh} className="text-xs underline text-[var(--color-brand)]">
          Retry
        </button>
      </div>
    );
  }

  const listIds = new Set(lists.map((l) => l.id));

  /** Tasks not belonging to a visible list */
  const standaloneTasks = tasks.filter((t) => !t.list_id || !listIds.has(t.list_id));

  /** Sort: incomplete first, completed at the end */
  const sortedTasks = [...standaloneTasks].sort((a, b) => {
    const aDone = completedIds.has(a.id) || a.status === "completed" ? 1 : 0;
    const bDone = completedIds.has(b.id) || b.status === "completed" ? 1 : 0;
    return aDone - bDone;
  });

  const listItems = lists.map((l) => ({
    list:  l as List,
    tasks: tasks.filter((t) => t.list_id === l.id),
  }));

  const totalScheduled = tasks.length;
  const totalDone = tasks.filter(
    (t) => completedIds.has(t.id) || t.status === "completed"
  ).length;

  return (
    <>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{dateLabel}</h1>
        {totalScheduled > 0 && (
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {totalDone} of {totalScheduled} done
          </p>
        )}
      </div>

      {totalScheduled === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-[var(--color-text-secondary)] text-sm">Nothing scheduled for today.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Lists */}
          {listItems.map(({ list, tasks: listTasks }) => (
            <ListCard
              key={list.id}
              list={{ ...list, tasks: listTasks }}
              completedIds={completedIds}
              tags={tags}
              onTaskClick={(t) => setInfoTask(t)}
            />
          ))}

          {/* Standalone tasks — completed sink to the bottom, no section label */}
          {sortedTasks.map((task) => {
            const isDone = completedIds.has(task.id) || task.status === "completed";
            return (
              <SwipeableWrapper
                key={task.id}
                onSwipeRight={isDone ? undefined : () => toggleComplete(task.id, task.is_recurring)}
                onSwipeLeft={isDone  ? () => toggleComplete(task.id, task.is_recurring) : undefined}
                rightLabel="Done"
                leftLabel="Undo"
                rightIcon={<CheckCircle className="w-4 h-4" />}
              >
                <RecordCard
                  task={task}
                  completedToday={completedIds.has(task.id)}
                  tags={tags}
                  onClick={() => setInfoTask(task)}
                />
              </SwipeableWrapper>
            );
          })}
        </div>
      )}

      {/* Info modal */}
      {infoTask && (
        <RCM
          open
          onClose={() => setInfoTask(null)}
          mode="info"
          initialKind="task"
          task={infoTask}
        />
      )}
    </>
  );
}
