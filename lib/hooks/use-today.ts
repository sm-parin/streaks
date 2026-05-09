"use client";
import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc";
import { useStreaks } from "@/lib/hooks/use-streaks";
import type { Task, List } from "@/lib/types";

export function useToday() {
  const { streaks, refresh: refreshStreaks } = useStreaks();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCompleteMutation = trpc.tasks.toggleComplete.useMutation();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];
      const todayDOW = new Date().getDay();

      const { data: taskRows, error: taskErr } = await supabase
        .from("tasks")
        .select("*")
        .in("status", ["accepted", "completed"])
        .or(
          `and(is_recurring.eq.true,is_disabled.eq.false,active_days.cs.{${todayDOW}}),` +
          `and(is_recurring.eq.false,is_global.eq.false,specific_date.lte.${today},status.neq.completed),` +
          `and(is_global.eq.true,is_disabled.eq.false,status.neq.completed)`
        );

      if (taskErr) throw new Error(taskErr.message);
      const rows = (taskRows ?? []) as Task[];

      // Fetch group names for tasks that belong to a group
      const groupIds = [...new Set(rows.filter((t) => t.group_id).map((t) => t.group_id as string))];
      let groupMap: Record<string, string> = {};
      if (groupIds.length) {
        const { data: gd } = await supabase.from("groups").select("id, name").in("id", groupIds);
        groupMap = Object.fromEntries((gd ?? []).map((g) => [g.id as string, g.name as string]));
      }

      const rowsWithGroups: Task[] = rows.map((t) => ({
        ...t,
        group_name: t.group_id ? groupMap[t.group_id] : undefined,
      }));

      // Only recurring tasks use task_completions; global tasks use task.status and are excluded from Today once completed.
      const recurringIds = rowsWithGroups.filter((t) => t.is_recurring).map((t) => t.id);
      let completedIdList: string[] = [];
      if (recurringIds.length) {
        const { data: comps } = await supabase
          .from("task_completions")
          .select("task_id")
          .in("task_id", recurringIds)
          .eq("completed_date", today);
        completedIdList = (comps ?? []).map((c) => c.task_id as string);
      }

      const listIds = [...new Set(rowsWithGroups.filter((t) => t.list_id).map((t) => t.list_id as string))];
      let listData: List[] = [];
      if (listIds.length) {
        const { data: ld } = await supabase.from("lists").select("*").in("id", listIds);
        listData = (ld ?? []) as List[];
      }

      setTasks(rowsWithGroups);
      setCompletedIds(new Set(completedIdList));
      setLists(listData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }

    // Refresh streaks in parallel (non-blocking)
    refreshStreaks();
  }, [refreshStreaks]);

  const toggleComplete = useCallback(
    async (taskId: string, isRecurring: boolean) => {
      const wasCompleted = completedIds.has(taskId);
      const today = new Date().toISOString().split("T")[0];

      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (wasCompleted) next.delete(taskId);
        else next.add(taskId);
        return next;
      });
      if (!isRecurring) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? ({ ...t, status: wasCompleted ? "accepted" : "completed" } as Task)
              : t
          )
        );
      }

      try {
        await toggleCompleteMutation.mutateAsync({ task_id: taskId, date: today, is_grace: false });
      } catch {
        setCompletedIds((prev) => {
          const next = new Set(prev);
          if (wasCompleted) next.add(taskId);
          else next.delete(taskId);
          return next;
        });
        if (!isRecurring) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? ({ ...t, status: wasCompleted ? "completed" : "accepted" } as Task)
                : t
            )
          );
        }
      }
    },
    [completedIds, toggleCompleteMutation]
  );

  const todayTotal = tasks.length;
  const todayDone = tasks.filter(
    // Recurring: tracked via completedIds (task_completions). NEVER use task.status for recurring.
    // One-off / global: task.status toggled optimistically until task disappears from list.
    (t) => t.is_recurring ? completedIds.has(t.id) : completedIds.has(t.id) || t.status === "completed"
  ).length;

  return { tasks, completedIds, lists, streaks, todayTotal, todayDone, loading, error, refresh, toggleComplete };
}
