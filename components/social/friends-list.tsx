"use client";
import { useState, useEffect, useCallback } from "react";
import { UserCheck, UserX, Activity } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import type { Friendship } from "@/lib/types";
import { RCM } from "@/components/records/rcm";

export function FriendsList() {
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<Friendship | null>(null);
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
                  <p className="text-xs text-[var(--color-text-secondary)]">@{f.friend?.username} — Pending</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!accepted.length && !pending.length && !sent.length && (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">
          <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No friends yet</p>
          <p className="text-sm mt-1">Find friends using the Find tab</p>
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
    </>
  );
}
