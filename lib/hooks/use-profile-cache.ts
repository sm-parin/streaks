"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ProfileEntry {
  username: string;
  avatar_url: string | null;
}

// Module-level cache — shared across all components, no double-fetch
const _cache = new Map<string, ProfileEntry>();
const _pending = new Set<string>();
const _listeners = new Set<() => void>();

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

export function getProfileFromCache(userId: string): ProfileEntry | null {
  return _cache.get(userId) ?? null;
}

/**
 * Batch-prefetches profiles for all given userIds not already cached.
 * Returns `getProfileFromCache` — call it synchronously per userId.
 * Call at list level to prefetch; TaskCard also calls it per-card as fallback.
 */
export function useProfileCache(userIds: string[]) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  // Derive a stable key from the unique ids to avoid stale deps
  const missing = userIds.filter((id) => id && !_cache.has(id) && !_pending.has(id));

  useEffect(() => {
    if (missing.length === 0) return;
    missing.forEach((id) => _pending.add(id));
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", missing)
      .then(({ data }) => {
        for (const row of data ?? []) {
          _cache.set(row.id, { username: row.username ?? "", avatar_url: row.avatar_url ?? null });
          _pending.delete(row.id);
        }
        notifyListeners();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing.join(",")]);

  return getProfileFromCache;
}
