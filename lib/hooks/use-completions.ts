"use client";
import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TaskCompletion } from "@/lib/types";

export function useCompletions() {
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: dbErr } = await supabase
      .from("task_completions")
      .select("*")
      .order("completed_date", { ascending: false });
    if (dbErr) {
      setError(dbErr.message);
    } else {
      setCompletions((data ?? []) as TaskCompletion[]);
    }
    setLoading(false);
  }, []);

  return { completions, loading, error, refresh };
}
