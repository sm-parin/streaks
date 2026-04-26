"use client";
import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc";
import type { Task, List } from "@/lib/types";

export function useToday() {
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
          `and(is_recurring.eq.true,active_days.cs.{${todayDOW}}),` +
          `and(is_recurring.eq.false,specific_date.lte.${today},status.neq.completed)`
        );

      if (taskErr) throw new Error(taskErr.message);
      const rows = (taskRows ?? []) as Task[];

      const recurringIds = rows.filter((t) => t.is_recurring).map((t) => t.id);
      let completedIdList: string[] = [];
      if (recurringIds.length) {
        const { data: comps } = await supabase
          .from("task_completions")
          .select("task_id")
          .in("task_id", recurringIds)
          .eq("completed_date", today);
        completedIdList = (comps ?? []).map((c) => c.task_id as string);
      }

      const listIds = [...new Set(rows.filter((t) => t.list_id).map((t) => t.list_id as string))];
      let listData: List[] = [];
      if (listIds.length) {
        const { data: ld } = await supabase.from("lists").select("*").in("id", listIds);
        listData = (ld ?? []) as List[];
      }

      setTasks(rows);
      setCompletedIds(new Set(completedIdList));
      setLists(listData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleComplete = useCallback(
    async (taskId: string, isRecurring: boolean) => {
      const wasCompleted = completedIds.has(taskId);
      const today = new Date().toISOString().split("T")[0];

      // Optimistic update
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
        // Rollback
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

  return { tasks, completedIds, lists, loading, error, refresh, toggleComplete };
}
