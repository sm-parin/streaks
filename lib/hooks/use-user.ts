"use client";
import { useState, useEffect, useCallback } from "react";
import type { User } from "@/lib/types";

let _cache: User | null = null;
const _listeners = new Set<() => void>();

function notify() { _listeners.forEach((fn) => fn()); }

export function setUser(u: User | null) { _cache = u; notify(); }

export function useUser() {
  const [user, setLocalUser] = useState<User | null>(_cache);
  const [loading, setLoading] = useState(_cache === null);

  useEffect(() => {
    const listener = () => setLocalUser(_cache);
    _listeners.add(listener);
    if (_cache === null) {
      fetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { _cache = d?.user ?? null; notify(); setLoading(false); })
        .catch(() => { setLoading(false); });
    } else {
      setLoading(false);
    }
    return () => { _listeners.delete(listener); };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/auth/me");
    const d = r.ok ? await r.json() : null;
    _cache = d?.user ?? null;
    notify();
    setLoading(false);
  }, []);

  return { user, loading, refetch };
}
