"use client";

import { useState } from "react";
import { ArrowLeft, Search, UserPlus, UserCheck, Loader2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubTabBar } from "@/components/ui/subtab-bar";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/lib/hooks/use-user";

type SubTab = "search" | "sent";

interface FindFriendsProps {
  /** Called when the user taps the back arrow */
  onBack: () => void;
}

const TABS: { id: SubTab; label: string }[] = [
  { id: "search", label: "Search" },
  { id: "sent",   label: "Sent Requests" },
];

/**
 * Full-screen "Find Friends" experience.
 * Rendered by SocialPage as a push-style screen (slides in from the right),
 * not as a modal or bottom sheet.
 */
export function FindFriends({ onBack }: FindFriendsProps) {
  const { user }         = useUser();
  const { showToast }    = useToast();
  const [subTab, setSubTab] = useState<SubTab>("search");

  const [query, setQuery]   = useState("");
  const [result, setResult] = useState<{
    user: { id: string; username: string; nickname: string; avatar_url: string | null };
    friendship: { status: string } | null;
  } | null>(null);
  const [searching, setSearching]       = useState(false);
  const [adding, setAdding]             = useState(false);
  const [sentRequests, setSentRequests] = useState<{ id: string; username: string }[]>([]);
  const [loadingSent, setLoadingSent]   = useState(false);

  /** Fetch pending sent requests (lazy — only on first visit to Sent tab) */
  const fetchSent = async () => {
    if (loadingSent || sentRequests.length) return;
    setLoadingSent(true);
    try {
      const r = await fetch("/api/social/friends?sent=true");
      if (r.ok) { const d = await r.json(); setSentRequests(d.requests ?? []); }
    } finally {
      setLoadingSent(false);
    }
  };

  const handleTabChange = (id: SubTab) => {
    setSubTab(id);
    if (id === "sent") fetchSent();
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    const r = await fetch(`/api/users/${encodeURIComponent(query.toLowerCase().trim())}`);
    setSearching(false);
    if (!r.ok) { showToast("User not found", "error"); return; }
    setResult(await r.json());
  };

  const sendRequest = async () => {
    if (!result) return;
    setAdding(true);
    const r = await fetch("/api/social/friends", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ addressee_id: result.user.id }),
    });
    setAdding(false);
    if (!r.ok) { showToast("Failed to send request", "error"); return; }
    showToast("Friend request sent!", "success");
    setResult((prev) => prev ? { ...prev, friendship: { status: "pending" } } : prev);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Screen header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-[var(--color-border)]">
        <button
          onClick={onBack}
          aria-label="Back"
          className="p-1.5 -ml-1.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Find Friends</h2>
      </div>

      {/* Subtabs */}
      <SubTabBar
        tabs={TABS}
        active={subTab}
        onChange={handleTabChange}
        accentColor="var(--tab-social)"
        className="px-4"
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {subTab === "search" ? (
          <>
            <form onSubmit={search} className="flex gap-2 mb-5">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Username..."
                className="flex-1"
                autoFocus
              />
              <Button type="submit" disabled={searching}>
                {searching
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Search className="w-4 h-4" />}
              </Button>
            </form>

            {result && (
              <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--color-border)]">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {result.user.nickname || result.user.username}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">@{result.user.username}</p>
                </div>
                {result.user.id === user?.id ? (
                  <span className="text-xs text-[var(--color-text-secondary)]">You</span>
                ) : result.friendship?.status === "accepted" ? (
                  <UserCheck className="w-5 h-5 text-[var(--tab-inbox)]" />
                ) : result.friendship?.status === "pending" ? (
                  <span className="text-xs text-[var(--color-text-secondary)]">Pending</span>
                ) : (
                  <Button size="sm" onClick={sendRequest} disabled={adding}>
                    {adding
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><UserPlus className="w-4 h-4 mr-1.5" />Add</>}
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {loadingSent ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-secondary)]" />
              </div>
            ) : sentRequests.length === 0 ? (
              <p className="text-center text-sm text-[var(--color-text-secondary)] py-12">
                No sent requests.
              </p>
            ) : (
              <div className="space-y-2">
                {sentRequests.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--color-border)]"
                  >
                    <p className="text-sm text-[var(--color-text-primary)]">@{u.username}</p>
                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
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
  );
}
