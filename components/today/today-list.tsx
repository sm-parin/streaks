"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { useToday } from "@/lib/hooks/use-today";
import { useUser } from "@/lib/hooks/use-user";
import { useTags } from "@/lib/hooks/use-tags";
import { type Task, type List } from "@/lib/types";
import { SwipeableWrapper } from "@/components/records/swipeable-wrapper";
import { RecordCard } from "@/components/records/record-card";
import { ListCard } from "@/components/records/list-card";
import { RCM } from "@/components/records/rcm";
import { PageHeader } from "@/components/layout/page-header";
import { MorningBrief } from "@/components/today/morning-brief";
import { MilestoneCard } from "@/components/today/milestone-card";

export function TodayList() {
  const { tasks, completedIds, lists, streaks, todayTotal, todayDone, loading, error, refresh, toggleComplete } = useToday();
  const { user } = useUser();
  const { tags } = useTags();
  const [infoTask, setInfoTask] = useState<Task | null>(null);

  useEffect(() => { refresh(); }, [refresh]);

  const today     = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  const progressTitle =
    todayTotal === 0
      ? "Nothing scheduled"
      : todayDone === todayTotal
      ? "All done today"
      : `${todayDone} of ${todayTotal} done`;

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
  const sortedTasks = [...standaloneTasks].sort((a, b) => {
    const aDone = completedIds.has(a.id) || a.status === "completed" ? 1 : 0;
    const bDone = completedIds.has(b.id) || b.status === "completed" ? 1 : 0;
    return aDone - bDone;
  });

  const listItems = lists.map((l) => ({
    list:  l as List,
    tasks: tasks.filter((t) => t.list_id === l.id),
  }));

  return (
    <>
      <PageHeader
        title={progressTitle}
        subtitle={dateLabel}
        progressBar={todayTotal > 0 ? { total: todayTotal, done: todayDone } : undefined}
      />

      <MorningBrief
        username={user?.username ?? "there"}
        todayTotal={todayTotal}
        completedIds={completedIds}
        streaks={streaks}
        tasks={tasks}
      />
      <MilestoneCard />

      {todayTotal === 0 ? (
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
