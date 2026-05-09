"use client";
import { useState, useEffect, useCallback } from "react";
import { UserCheck, UserX, Activity, BarChart2, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import type { Friendship, UserStatsCache } from "@/lib/types";
import { RCM } from "@/components/records/rcm";

function StatValue({ value, isPercent }: { value: number | null; isPercent?: boolean }) {
  if (value === null) return <span className="font-mono text-[var(--color-text-disabled)]">—</span>;
  return (
    <span className="font-mono font-semibold text-[var(--color-text-primary)]">
      {isPercent ? `${value.toFixed(3)}%` : value.toFixed(3)}
    </span>
  );
}

function FriendStatsPanel({
  userId,
  name,
  onClose,
}: {
  userId: string;
  name: string;
  onClose: () => void;
}) {
  const [stats, setStats] = useState<UserStatsCache | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/profile/stats/${userId}`);
        if (r.ok && !cancelled) {
          const d = await r.json();
          setStats(d.stats ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[var(--color-surface-raised)] border-t border-[var(--color-border)] rounded-t-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{name}’s Stats</p>
          <button onClick={onClose} className="p-1 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-[var(--color-border)] rounded" style={{ width: `${55 + i * 10}%` }} />
            ))}
          </div>
        ) : !stats ? (
          <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">No stats available yet.</p>
        ) : (
          <div className="space-y-3">
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-semibold text-[var(--color-text-disabled)] uppercase tracking-wide">Streak Stats</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--color-text-secondary)]">Consistency Rating</span>
                <StatValue value={stats.streak_consistency_rating} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--color-text-secondary)]">Discipline</span>
                <StatValue value={stats.streak_discipline_pct} isPercent />
              </div>
            </div>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-semibold text-[var(--color-text-disabled)] uppercase tracking-wide">Milestone Stats</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--color-text-secondary)]">Today · Week · Month · Year</span>
                <div className="flex items-center gap-1 text-xs">
                  <StatValue value={stats.daily_milestone} />
                  <span className="text-[var(--color-text-disabled)]">·</span>
                  <StatValue value={stats.weekly_milestone} />
                  <span className="text-[var(--color-text-disabled)]">·</span>
                  <StatValue value={stats.monthly_milestone} />
                  <span className="text-[var(--color-text-disabled)]">·</span>
                  <StatValue value={stats.yearly_milestone} />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--color-text-secondary)]">Consistency Rating</span>
                <StatValue value={stats.milestone_consistency_rating} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FriendsList({ onFindFriends }: { onFindFriends?: () => void }) {
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<Friendship | null>(null);
  const [viewingStats, setViewingStats] = useState<{ userId: string; name: string } | null>(null);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/social/friends");
    if (r.ok) { const d = await r.json(); setFriendships(d.friendships ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const respond = async (id: string, action: "accept" | "reject") => {
    await fetch(`/api/social/friends/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    showToast(action === "accept" ? "Friend accepted!" : "Request rejected", action === "accept" ? "success" : "info");
    load();
  };

  const accepted = friendships.filter((f) => f.status === "accepted");
  const pending   = friendships.filter((f) => f.status === "pending" && !f.is_requester);
  const sent      = friendships.filter((f) => f.status === "pending" && f.is_requester);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <>
      {pending.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase mb-2">
            Incoming Requests ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((f) => (
              <div key={f.id} className="flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-brand)] rounded-[var(--radius-lg)] p-3">
                <div className="w-9 h-9 rounded-full bg-[var(--color-brand-light)] flex items-center justify-center text-sm font-bold text-[var(--color-brand)]">
                  {(f.friend?.nickname ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{f.friend?.nickname}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">@{f.friend?.username}</p>
                </div>
                <button onClick={() => respond(f.id, "accept")} className="p-1.5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]">
                  <UserCheck className="w-4 h-4" />
                </button>
                <button onClick={() => respond(f.id, "reject")} className="p-1.5 rounded-full bg-[var(--color-error-bg)] text-[var(--color-error)]">
                  <UserX className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {accepted.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase mb-2">
            Friends ({accepted.length})
          </h3>
          <div className="space-y-2">
            {accepted.map((f) => (
              <div key={f.id} className="flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-3">
                <div className="w-9 h-9 rounded-full bg-[var(--color-success-bg)] flex items-center justify-center text-sm font-bold text-[var(--color-success)]">
                  {(f.friend?.nickname ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{f.friend?.nickname}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">@{f.friend?.username}</p>
                </div>
                <button onClick={() => setAssigning(f)} className="p-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                  <Activity className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewingStats({ userId: f.friend?.id ?? "", name: f.friend?.nickname ?? f.friend?.username ?? "?" })}
                  className="p-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {sent.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase mb-2">Sent Requests</h3>
          <div className="space-y-2">
            {sent.map((f) => (
              <div key={f.id} className="flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-3 opacity-70">
                <div className="w-9 h-9 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center text-sm font-bold text-[var(--color-text-secondary)]">
                  {(f.friend?.nickname ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{f.friend?.nickname}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">@{f.friend?.username} â€” Pending</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!accepted.length && !pending.length && !sent.length && (
        <div className="text-center py-12 space-y-3">
          <UserCheck className="w-10 h-10 mx-auto text-[var(--color-text-disabled)]" />
          <p className="font-medium text-[var(--color-text-primary)]">No friends yet</p>
          <button
            onClick={onFindFriends}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--tab-social)] text-white text-sm font-medium"
          >
            Find friends
          </button>
        </div>
      )}

      {assigning && (
        <RCM
          open={!!assigning}
          mode="create"
          initialKind="task"
          prefill={{ assignee_user_id: assigning.friend?.id }}
          onClose={() => setAssigning(null)}
          onSave={() => { setAssigning(null); showToast("Task assigned!", "success"); }}
        />
      )}

      {viewingStats && (
        <FriendStatsPanel
          userId={viewingStats.userId}
          name={viewingStats.name}
          onClose={() => setViewingStats(null)}
        />
      )}
    </>
  );
}

