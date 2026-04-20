"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskFormData } from "@/lib/types";
import { useToast } from "@/components/ui/toast";

/**
 * Manages the full lifecycle of tasks for the authenticated user.
 * All reads and writes go directly to Supabase.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();

  /** Browser-singleton Supabase client */
  const supabase = createClient();

  /**
   * Loads all tasks for the current user, ordered by creation date.
   * Exposed so callers can manually trigger a refresh.
   */
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      showToast("Failed to load tasks", "error");
    } else {
      setTasks((data as Task[]) ?? []);
    }

    setLoading(false);
  }, [supabase, showToast]);

  /** Fetch on mount */
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /**
   * Creates a new task for the authenticated user.
   * @returns true on success, false on failure
   */
  const createTask = useCallback(
    async (formData: TaskFormData): Promise<boolean> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showToast("Not authenticated", "error");
        return false;
      }

      const { error: insertError } = await supabase.from("tasks").insert({
        ...formData,
        user_id: user.id,
        is_active: true,
      });

      if (insertError) {
        showToast(insertError.message, "error");
        return false;
      }

      showToast("Task created!", "success");
      await fetchTasks();
      return true;
    },
    [supabase, fetchTasks, showToast]
  );

  /**
   * Updates the mutable fields of an existing task.
   * @returns true on success, false on failure
   */
  const updateTask = useCallback(
    async (id: string, formData: Partial<TaskFormData>): Promise<boolean> => {
      const { error: updateError } = await supabase
        .from("tasks")
        .update(formData)
        .eq("id", id);

      if (updateError) {
        showToast(updateError.message, "error");
        return false;
      }

      showToast("Task updated!", "success");
      await fetchTasks();
      return true;
    },
    [supabase, fetchTasks, showToast]
  );

  /**
   * Toggles a task between active and paused states.
   * Paused tasks are hidden from Today's Tasks but retain all history.
   * @returns true on success, false on failure
   */
  const toggleTaskActive = useCallback(
    async (id: string, currentlyActive: boolean): Promise<boolean> => {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ is_active: !currentlyActive })
        .eq("id", id);

      if (updateError) {
        showToast(updateError.message, "error");
        return false;
      }

      await fetchTasks();
      return true;
    },
    [supabase, fetchTasks, showToast]
  );

  /**
   * Permanently deletes a task and all its completions (cascade handled by DB).
   * @returns true on success, false on failure
   */
  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);

      if (deleteError) {
        showToast(deleteError.message, "error");
        return false;
      }

      showToast("Task deleted", "success");
      await fetchTasks();
      return true;
    },
    [supabase, fetchTasks, showToast]
  );

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    toggleTaskActive,
    deleteTask,
  };
}
