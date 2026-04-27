"use client";
import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { StreakResult } from "@/lib/types";

/**
 * Invokes the streak-calc Supabase Edge Function.
 * Returns pre-computed streak data including grace-day detection and write-back.
 */
export function useStreaks() {
  const [streaks, setStreaks] = useState<StreakResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: fnErr } = await supabase.functions.invoke("streak-calc", {
        body: {},
      });
      if (fnErr) throw fnErr;
      setStreaks((data as StreakResult[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { streaks, isLoading, error, refresh };
}
