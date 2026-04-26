"use client";
import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, List } from "@/lib/types";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const [{ data: taskRows, error: tErr }, { data: listRows, error: lErr }] =
        await Promise.all([
          supabase.from("tasks").select("*").not("status", "eq", "rejected").order("updated_at", { ascending: false }),
          supabase.from("lists").select("*").order("created_at", { ascending: false }),
        ]);
      if (tErr) throw new Error(tErr.message);
      if (lErr) throw new Error(lErr.message);
      const allTasks = (taskRows ?? []) as Task[];
      const allLists = (listRows ?? []) as List[];
      const listIdSet = new Set(allLists.map((l) => l.id));
      setTasks(allTasks.filter((t) => !t.list_id || !listIdSet.has(t.list_id)));
      setLists(allLists.map((l) => ({ ...l, tasks: allTasks.filter((t) => t.list_id === l.id) })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to create");
    return json.record as Task;
  }, []);

  const updateTask = useCallback(async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to update");
    return json.record as Task;
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? "Failed to delete");
    }
  }, []);

  const respondToTask = useCallback(async (id: string, action: "accept" | "reject") => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed");
    return json;
  }, []);

  return { tasks, lists, loading, error, refresh, createTask, updateTask, deleteTask, respondToTask };
}
