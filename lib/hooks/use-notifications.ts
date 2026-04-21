"use client";
import { useState, useEffect, useCallback } from "react";
import type { Notification } from "@/lib/types";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    const r = await fetch("/api/notifications");
    if (!r.ok) return;
    const d = await r.json();
    setNotifications(d.notifications ?? []);
    setUnreadCount(d.unread_count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, loading, refetch: fetch_, markAllRead };
}
