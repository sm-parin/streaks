"use client";

import { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";

export function MilestoneCard() {
  const [notif, setNotif] = useState<Notification | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function fetchMilestone() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "streak_milestone")
        .gte("created_at", cutoff)
        .eq("read", false)
        .limit(1)
        .maybeSingle();

      if (data) setNotif(data as Notification);
    }

    fetchMilestone();
  }, []);

  const dismiss = async () => {
    if (!notif) return;
    setDismissed(true);
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", notif.id);
  };

  if (!notif || dismissed) return null;

  const payload = notif.payload as Record<string, unknown>;
  const days = Number(payload.streak_days ?? payload.days ?? 0);
  const habit = String(payload.task_title ?? payload.habit ?? "a habit");

  return (
    <div className="rounded-xl bg-[var(--color-surface-raised)] px-4 py-3 flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <Flame className="w-5 h-5 text-[#EF4444] shrink-0" />
        <p className="text-sm text-[var(--color-text-primary)] min-w-0">
          You hit a <span className="font-semibold">{days}-day streak</span> on &apos;{habit}&apos;!
        </p>
      </div>
      <button
        onClick={dismiss}
        className="text-xs text-[var(--color-text-secondary)] shrink-0 hover:text-[var(--color-text-primary)] transition-colors"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
