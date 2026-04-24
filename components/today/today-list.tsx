"use client";
import { useEffect, useState } from "react";
import { CheckCircle, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useToday } from "@/lib/hooks/use-today";
import { useTags } from "@/lib/hooks/use-tags";
import { type Task, type List } from "@/lib/types";
import { SwipeableWrapper } from "@/components/records/swipeable-wrapper";
import { RecordCard } from "@/components/records/record-card";
import { ListCard } from "@/components/records/list-card";
import { RCM } from "@/components/records/rcm";

export function TodayList() {
  const { tasks, completedIds, lists, loading, error, refresh, toggleComplete } = useToday();
  const { tags } = useTags();
  const [infoTask, setInfoTask] = useState<Task | null>(null);

  useEffect(() => { refresh(); }, [refresh]);

  const today = new Date();
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
  const standaloneTasks = tasks.filter((t) => !t.list_id || !listIds.has(t.list_id));

  const listItems = lists.map((l) => ({
    list: l as List,
    tasks: tasks.filter((t) => t.list_id === l.id),
  }));

  const incompleteTasks = standaloneTasks.filter(
    (t) => !completedIds.has(t.id) && t.status !== "completed"
  );
  const completedTasks = standaloneTasks.filter(
    (t) => completedIds.has(t.id) || t.status === "completed"
  );

  const totalScheduled = tasks.length;
  const totalDone = tasks.filter(
    (t) => completedIds.has(t.id) || t.status === "completed"
  ).length;

  return (
    <>
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
          {listItems.map(({ list, tasks: listTasks }) => (
            <ListCard
              key={list.id}
              list={{ ...list, tasks: listTasks }}
              completedIds={completedIds}
              tags={tags}
              onTaskClick={(t) => setInfoTask(t)}
            />
          ))}

          {incompleteTasks.map((task) => (
            <SwipeableWrapper
              key={task.id}
              onSwipeRight={() => toggleComplete(task.id, task.is_recurring)}
              rightLabel="Done"
              rightIcon={<CheckCircle className="w-4 h-4" />}
            >
              <RecordCard
                task={task}
                completedToday={false}
                tags={tags}
                onClick={() => setInfoTask(task)}
              />
            </SwipeableWrapper>
          ))}

          {completedTasks.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide font-medium px-1">
                Completed
              </p>
              {completedTasks.map((task) => (
                <SwipeableWrapper
                  key={task.id}
                  onSwipeLeft={() => toggleComplete(task.id, task.is_recurring)}
                  leftLabel="Undo"
                  leftIcon={<Circle className="w-4 h-4" />}
                >
                  <RecordCard
                    task={task}
                    completedToday={completedIds.has(task.id)}
                    tags={tags}
                    onClick={() => setInfoTask(task)}
                  />
                </SwipeableWrapper>
              ))}
            </div>
          )}
        </div>
      )}

      {infoTask && (
        <RCM
          open={!!infoTask}
          onClose={() => setInfoTask(null)}
          mode="info"
          initialKind="task"
          task={infoTask}
        />
      )}
    </>
  );
}
