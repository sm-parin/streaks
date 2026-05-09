"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToday } from "@/lib/hooks/use-today";
import { useUser } from "@/lib/hooks/use-user";
import { useTags } from "@/lib/hooks/use-tags";
import { useProfileCache } from "@/lib/hooks/use-profile-cache";
import { type Task, type List } from "@/lib/types";
import { SwipeableWrapper } from "@/components/records/swipeable-wrapper";
import { TaskCard } from "@/components/tasks/task-card";
import { ListCard } from "@/components/records/list-card";
import { RCM } from "@/components/records/rcm";
import { PageHeader } from "@/components/layout/page-header";
import { MorningBrief } from "@/components/today/morning-brief";
import { MilestoneCard } from "@/components/today/milestone-card";

export function TodayList() {
  const { tasks, completedIds, lists, streaks, todayTotal, todayDone, loading, error, refresh, toggleComplete } = useToday();
  const { user } = useUser();
  const { tags } = useTags();
  const router = useRouter();
  const [infoTask, setInfoTask] = useState<Task | null>(null);

  // Batch-prefetch assigner profiles so TaskCard doesn't fetch one-by-one
  const allAssignerIds = useMemo(
    () => tasks.map((t) => t.assigner_user_id).filter((id): id is string => !!id),
    [tasks]
  );
  useProfileCache(allAssignerIds);

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
      <div className="text-center py-16 space-y-3">
        <p className="text-sm text-[var(--color-text-secondary)]">Something went wrong</p>
        <button onClick={refresh} className="text-sm text-[var(--color-brand)] underline">Retry</button>
      </div>
    );
  }

  const listIds = new Set(lists.map((l) => l.id));
  const standaloneTasks = tasks.filter((t) => !t.list_id || !listIds.has(t.list_id));
  const sortedTasks = [...standaloneTasks].sort((a, b) => {
    const aDone = (a.is_recurring ? completedIds.has(a.id) : completedIds.has(a.id) || a.status === "completed") ? 1 : 0;
    const bDone = (b.is_recurring ? completedIds.has(b.id) : completedIds.has(b.id) || b.status === "completed") ? 1 : 0;
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
        <div className="text-center py-16 space-y-3">
          {/* Calendar SVG icon */}
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-base font-semibold text-[var(--color-text-primary)]">Nothing scheduled for today</p>
          <p className="text-sm text-[var(--color-text-secondary)]">Add habits from the Habits tab</p>
          <button
            onClick={() => router.push("/habits")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-brand)] text-white text-sm font-medium"
          >
            Add a habit
          </button>
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
            // Recurring: completedIds is source of truth. One-off/global: task.status.
            const isDone = task.is_recurring ? completedIds.has(task.id) : completedIds.has(task.id) || task.status === "completed";
            return (
              <SwipeableWrapper
                key={task.id}
                onSwipeRight={isDone ? undefined : () => toggleComplete(task.id, task.is_recurring)}
                onSwipeLeft={isDone  ? () => toggleComplete(task.id, task.is_recurring) : undefined}
                rightLabel="Done"
                leftLabel="Undo"
                rightIcon={<CheckCircle className="w-4 h-4" />}
              >
                <TaskCard
                  task={task}
                  completedToday={completedIds.has(task.id)}
                  showDays={false}
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
