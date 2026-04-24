"use client";
import { useState } from "react";
import { Search, UserPlus, UserCheck, Loader2, Clock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils/cn";

type SubTab = "search" | "sent";

interface FindFriendsProps {
  onClose?: () => void;
}

export function FindFriends({ onClose }: FindFriendsProps) {
  const { user } = useUser();
  const [subTab, setSubTab] = useState<SubTab>("search");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{
    user: { id: string; username: string; nickname: string; avatar_url: string | null };
    friendship: { status: string } | null;
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [sentRequests, setSentRequests] = useState<{ id: string; username: string }[]>([]);
  const [loadingSent, setLoadingSent] = useState(false);
  const { showToast } = useToast();

  const fetchSent = async () => {
    if (loadingSent) return;
    setLoadingSent(true);
    try {
      const r = await fetch("/api/social/friends?sent=true");
      if (r.ok) { const d = await r.json(); setSentRequests(d.requests ?? []); }
    } finally {
      setLoadingSent(false);
    }
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    const r = await fetch(`/api/users/${query.toLowerCase().trim()}`);
    setSearching(false);
    if (!r.ok) { showToast("User not found", "error"); return; }
    setResult(await r.json());
  };

  const sendRequest = async () => {
    if (!result) return;
    setAdding(true);
    const r = await fetch("/api/social/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressee_id: result.user.id }),
    });
    setAdding(false);
    if (!r.ok) { showToast("Failed to send request", "error"); return; }
    showToast("Friend request sent!", "success");
    setResult((prev) => prev ? { ...prev, friendship: { status: "pending" } } : prev);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[var(--color-surface-raised)] rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Find Friends</h2>
          {onClose && (
            <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex gap-1 mx-5 mb-4 p-1 bg-[var(--color-bg-secondary)] rounded-xl">
          {([
            { id: "search" as SubTab, label: "Search", icon: <Search className="w-4 h-4" /> },
            { id: "sent"   as SubTab, label: "Sent",   icon: <Clock  className="w-4 h-4" /> },
          ]).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => { setSubTab(id); if (id === "sent") fetchSent(); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all",
                subTab === id
                  ? "bg-[var(--color-surface-raised)] text-[var(--tab-social)] shadow-sm"
                  : "text-[var(--color-text-secondary)]"
              )}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        <div className="px-5 pb-5">
          {subTab === "search" ? (
            <>
              <form onSubmit={search} className="flex gap-2 mb-4">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by username..."
                  className="flex-1"
                />
                <Button type="submit" disabled={searching}>
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </form>

              {result && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)]">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {result.user.nickname || result.user.username}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">@{result.user.username}</p>
                  </div>
                  {result.user.id === user?.id ? (
                    <span className="text-xs text-[var(--color-text-secondary)]">That's you!</span>
                  ) : result.friendship?.status === "accepted" ? (
                    <UserCheck className="w-5 h-5 text-[var(--tab-inbox)]" />
                  ) : result.friendship?.status === "pending" ? (
                    <span className="text-xs text-[var(--color-text-secondary)]">Pending...</span>
                  ) : (
                    <Button size="sm" onClick={sendRequest} disabled={adding}>
                      {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {loadingSent ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-secondary)]" />
                </div>
              ) : sentRequests.length === 0 ? (
                <p className="text-center text-sm text-[var(--color-text-secondary)] py-8">
                  No sent requests.
                </p>
              ) : (
                <div className="space-y-2">
                  {sentRequests.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)]"
                    >
                      <p className="text-sm text-[var(--color-text-primary)]">@{u.username}</p>
                      <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
