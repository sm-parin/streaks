"use client";
import { useState, useCallback } from "react";
import type { AppRecord } from "@/lib/types";

export function useRecords() {
  const [records, setRecords] = useState<AppRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/records");
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load");
      const json = await res.json();
      setRecords(json.records ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const createRecord = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to create");
    return json.record as AppRecord;
  }, []);

  const updateRecord = useCallback(async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/records/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to update");
    return json.record as AppRecord;
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? "Failed to delete");
    }
  }, []);

  const respondToRecord = useCallback(async (id: string, action: "accept" | "reject") => {
    const res = await fetch(`/api/records/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed");
    return json;
  }, []);

  return { records, loading, error, refresh, createRecord, updateRecord, deleteRecord, respondToRecord };
}
