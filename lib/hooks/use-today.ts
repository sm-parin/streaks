"use client";
import { useState, useCallback } from "react";
import type { Task, List } from "@/lib/types";

export interface TodayState {
  tasks: Task[];
  completedIds: Set<string>;
  lists: List[];
  loading: boolean;
  error: string | null;
}

export function useToday() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/today");
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load");
      const json = await res.json();
      setTasks(json.tasks ?? []);
      setCompletedIds(new Set(json.completedIds ?? []));
      setLists(json.lists ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleComplete = useCallback(async (taskId: string, isRecurring: boolean) => {
    const wasCompleted = completedIds.has(taskId);

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
          t.id === taskId ? { ...t, status: wasCompleted ? "accepted" : "completed" } as Task : t
        )
      );
    }

    try {
      const res = await fetch(`/api/records/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date().toISOString().split("T")[0] }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      // Roll back on failure
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (wasCompleted) next.add(taskId);
        else next.delete(taskId);
        return next;
      });
      if (!isRecurring) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: wasCompleted ? "completed" : "accepted" } as Task : t
          )
        );
      }
    }
  }, [completedIds]);

  return { tasks, completedIds, lists, loading, error, refresh, toggleComplete };
}
