"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskFormData } from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { IS_DEV_MODE } from "@/lib/dev/is-dev-mode";
import { devStore } from "@/lib/dev/mock-store";

/**
 * Manages the full lifecycle of tasks for the authenticated user.
 *
 * In dev mode (NEXT_PUBLIC_DEV_MODE=true) all reads and writes go to the
 * in-memory devStore instead of Supabase so the app works without credentials.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();

  // ΓöÇΓöÇΓöÇ Dev-mode branch ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  useEffect(() => {
    if (!IS_DEV_MODE) return;
    /** Sync from store immediately and subscribe to future changes */
    setTasks(devStore.getTasks());
    setLoading(false);
    return devStore.subscribe(() => setTasks(devStore.getTasks()));
  }, []);

  const devCreateTask = useCallback(
    async (formData: TaskFormData): Promise<boolean> => {
      devStore.addTask({ ...formData, description: formData.description ?? null, is_active: true });
      showToast("Task created!", "success");
      return true;
    },
    [showToast]
  );

  const devUpdateTask = useCallback(
    async (id: string, formData: Partial<TaskFormData>): Promise<boolean> => {
      devStore.updateTask(id, formData);
      showToast("Task updated!", "success");
      return true;
    },
    [showToast]
  );

  const devToggleTaskActive = useCallback(
    async (id: string, currentlyActive: boolean): Promise<boolean> => {
      devStore.updateTask(id, { is_active: !currentlyActive });
      return true;
    },
    []
  );

  const devDeleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      devStore.deleteTask(id);
      showToast("Task deleted", "success");
      return true;
    },
    [showToast]
  );

  if (IS_DEV_MODE) {
    return {
      tasks,
      loading,
      error,
      fetchTasks: async () => setTasks(devStore.getTasks()),
      createTask: devCreateTask,
      updateTask: devUpdateTask,
      toggleTaskActive: devToggleTaskActive,
      deleteTask: devDeleteTask,
    };
  }

  // ΓöÇΓöÇΓöÇ Production branch ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  /** Stable Supabase client reference (browser singleton) */
  const supabase = createClient();

  // ΓöÇΓöÇΓöÇ Fetch ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ΓöÇΓöÇΓöÇ Mutations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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
