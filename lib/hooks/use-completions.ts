"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TaskCompletion } from "@/lib/types";
import { getTodayString } from "@/lib/utils/date";
import { useToast } from "@/components/ui/toast";
import { IS_DEV_MODE } from "@/lib/dev/is-dev-mode";
import { devStore } from "@/lib/dev/mock-store";

/**
 * Fetches task completions within an optional date range and provides an
 * optimistic-update toggle function.
 *
 * In dev mode (NEXT_PUBLIC_DEV_MODE=true) reads and writes go to the
 * in-memory devStore instead of Supabase.
 *
 * @param startDate - Earliest date to include (YYYY-MM-DD). Defaults to today.
 * @param endDate   - Latest date to include (YYYY-MM-DD). Defaults to today.
 */
export function useCompletions(startDate?: string, endDate?: string) {
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();

  const today = getTodayString();
  const resolvedStart = startDate ?? today;
  const resolvedEnd = endDate ?? today;

  // ΓöÇΓöÇΓöÇ Dev-mode branch ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  useEffect(() => {
    if (!IS_DEV_MODE) return;
    /** Sync filtered completions from store and subscribe to future changes */
    const sync = () =>
      setCompletions(devStore.getCompletions(resolvedStart, resolvedEnd));
    sync();
    setLoading(false);
    return devStore.subscribe(sync);
    // resolvedStart/End are strings; referencing them directly is intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedStart, resolvedEnd]);

  const devToggleCompletion = useCallback(
    async (taskId: string, date: string): Promise<void> => {
      devStore.toggleCompletion(taskId, date);
    },
    []
  );

  if (IS_DEV_MODE) {
    return {
      completions,
      loading,
      error,
      toggleCompletion: devToggleCompletion,
      refetch: async () =>
        setCompletions(devStore.getCompletions(resolvedStart, resolvedEnd)),
    };
  }

  // ΓöÇΓöÇΓöÇ Production branch ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  const supabase = createClient();

  /**
   * Keep stable refs so fetchCompletions can be listed as a dep without
   * causing infinite re-renders when resolvedStart/End are inline strings.
   */
  const startRef = useRef(resolvedStart);
  const endRef = useRef(resolvedEnd);
  startRef.current = resolvedStart;
  endRef.current = resolvedEnd;

  // ΓöÇΓöÇΓöÇ Fetch ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  /**
   * Loads completions from Supabase within the configured date range.
   */
  const fetchCompletions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("task_completions")
      .select("*")
      .gte("completed_date", startRef.current)
      .lte("completed_date", endRef.current)
      .order("completed_date", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      showToast("Failed to load completions", "error");
    } else {
      setCompletions((data as TaskCompletion[]) ?? []);
    }

    setLoading(false);
  }, [supabase, showToast]);

  useEffect(() => {
    fetchCompletions();
  }, [fetchCompletions]);

  // ΓöÇΓöÇΓöÇ Toggle ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  /**
   * Toggles the completion state of a task on a specific date.
   * Applies an optimistic UI update first, then reconciles with the DB.
   * Reverts to the previous state if the DB operation fails.
   *
   * @param taskId - UUID of the task
   * @param date   - ISO date string (YYYY-MM-DD)
   */
  const toggleCompletion = useCallback(
    async (taskId: string, date: string): Promise<void> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showToast("Not authenticated", "error");
        return;
      }

      const existing = completions.find(
        (c) => c.task_id === taskId && c.completed_date === date
      );

      if (existing) {
        /** Optimistic remove */
        setCompletions((prev) => prev.filter((c) => c.id !== existing.id));

        const { error: deleteError } = await supabase
          .from("task_completions")
          .delete()
          .eq("id", existing.id);

        if (deleteError) {
          /** Revert on failure */
          setCompletions((prev) => [existing, ...prev]);
          showToast("Failed to update", "error");
        }
      } else {
        /** Optimistic add with a temporary ID */
        const optimisticId = `optimistic-${Date.now()}`;
        const optimistic: TaskCompletion = {
          id: optimisticId,
          task_id: taskId,
          user_id: user.id,
          completed_date: date,
          created_at: new Date().toISOString(),
        };

        setCompletions((prev) => [optimistic, ...prev]);

        const { data, error: insertError } = await supabase
          .from("task_completions")
          .insert({ task_id: taskId, user_id: user.id, completed_date: date })
          .select()
          .single();

        if (insertError) {
          /** Revert on failure */
          setCompletions((prev) => prev.filter((c) => c.id !== optimisticId));
          showToast("Failed to update", "error");
        } else if (data) {
          /** Replace optimistic entry with the real DB record */
          setCompletions((prev) =>
            prev.map((c) =>
              c.id === optimisticId ? (data as TaskCompletion) : c
            )
          );
        }
      }
    },
    [supabase, completions, showToast]
  );

  return { completions, loading, error, toggleCompletion, refetch: fetchCompletions };
}
