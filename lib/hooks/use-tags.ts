"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tag } from "@/lib/types";

// Module-level cache — survives component remounts, avoids refetch on every RCM open
let _cache: Tag[] | null = null;
const _listeners = new Set<() => void>();
function notifyListeners() { _listeners.forEach((fn) => fn()); }

export function useTags() {
  const [tags, setTags] = useState<Tag[]>(_cache ?? []);
  const [isLoading, setIsLoading] = useState(_cache === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const listener = () => setTags(_cache ?? []);
    _listeners.add(listener);

    if (_cache !== null) {
      setIsLoading(false);
      return () => { _listeners.delete(listener); };
    }

    const supabase = createClient();
    supabase
      .from("tags")
      .select("id, name, color, category, created_at")
      .order("name")
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); }
        else { _cache = (data ?? []) as Tag[]; notifyListeners(); }
        setIsLoading(false);
      });

    return () => { _listeners.delete(listener); };
  }, []);

  return { tags, isLoading, error };
}
