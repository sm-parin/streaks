"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Search, UserPlus, UserCheck, Loader2, Clock, Link2, Copy, Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubTabBar } from "@/components/ui/subtab-bar";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/lib/hooks/use-user";

type SubTab = "search" | "sent" | "invite";

interface FindFriendsProps {
  /** Called when the user taps the back arrow */
  onBack: () => void;
}

const TABS: { id: SubTab; label: string }[] = [
  { id: "search", label: "Search"           },
  { id: "sent",   label: "Sent Requests"    },
  { id: "invite", label: "Invite Friends"   },
];

type SearchUser = {
  id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  friendship: { id: string; status: string; is_requester: boolean } | null;
};

/**
 * Full-screen "Find Friends" experience.
 * Rendered by SocialPage as a push-style screen (slides in from the right),
 * not as a modal or bottom sheet.
 */
export function FindFriends({ onBack }: FindFriendsProps) {
  const { user }      = useUser();
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<SubTab>("search");

  // ── Search tab ──────────────────────────────────────────────────────────
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId,  setAddingId]  = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`);
      if (r.ok) {
        const d = await r.json();
        setResults(d.users ?? []);
      }
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  const sendRequest = async (targetId: string) => {
    setAddingId(targetId);
    const r = await fetch("/api/social/friends", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ addressee_id: targetId }),
    });
    setAddingId(null);
    if (!r.ok) { showToast("Failed to send request", "error"); return; }
    showToast("Friend request sent!", "success");
    setResults((prev) =>
      prev.map((u) =>
        u.id === targetId
          ? { ...u, friendship: { id: "", status: "pending", is_requester: true } }
          : u
      )
    );
  };

  // ── Sent tab ────────────────────────────────────────────────────────────
  const [sentRequests, setSentRequests] = useState<{ id: string; username: string }[]>([]);
  const [loadingSent,  setLoadingSent]  = useState(false);

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

  // ── Invite tab ──────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/register${user?.username ? `?ref=${user.username}` : ""}`
      : "";

  const copyLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join me on Streaks!", url: inviteLink });
      } else {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // share cancelled or clipboard denied — silent fail
    }
  };

  const handleTabChange = (id: SubTab) => {
    setSubTab(id);
    if (id === "sent") fetchSent();
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

        {/* ── Search ── */}
        {subTab === "search" && (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-disabled)]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or username…"
                className="pl-9"
                autoFocus
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[var(--color-text-secondary)]" />
              )}
            </div>

            {results.length > 0 ? (
              <div className="space-y-2">
                {results.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--color-border)]"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {u.nickname || u.username}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">@{u.username}</p>
                    </div>

                    {u.id === user?.id ? (
                      <span className="text-xs text-[var(--color-text-secondary)]">You</span>
                    ) : u.friendship?.status === "accepted" ? (
                      <UserCheck className="w-5 h-5 text-[var(--tab-inbox)]" />
                    ) : u.friendship?.status === "pending" ? (
                      <span className="text-xs text-[var(--color-text-secondary)]">Pending</span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={addingId === u.id}
                        onClick={() => sendRequest(u.id)}
                      >
                        {addingId === u.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <><UserPlus className="w-4 h-4 mr-1.5" />Add</>}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : query.trim() && !searching ? (
              <p className="text-center text-sm text-[var(--color-text-secondary)] py-10">
                No users found for &ldquo;{query}&rdquo;
              </p>
            ) : null}
          </>
        )}

        {/* ── Sent Requests ── */}
        {subTab === "sent" && (
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

        {/* ── Invite Friends ── */}
        {subTab === "invite" && (
          <div className="flex flex-col items-center text-center pt-8 pb-4 gap-6">
            <div className="w-14 h-14 rounded-xl bg-[var(--color-bg-secondary)] flex items-center justify-center">
              <Link2 className="w-7 h-7 text-[var(--tab-social)]" />
            </div>

            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                Invite via link
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] max-w-xs">
                Share your personal invite link. Anyone who signs up through it
                will be suggested as a friend.
              </p>
            </div>

            {/* Link preview */}
            <div className="w-full max-w-sm flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <p className="flex-1 text-xs text-[var(--color-text-secondary)] truncate text-left">
                {inviteLink}
              </p>
            </div>

            <Button
              onClick={copyLink}
              className="gap-2"
              style={{
                backgroundColor: "var(--tab-social)",
                borderColor:     "var(--tab-social)",
                color:           "#fff",
              }}
            >
              {copied
                ? <><Check className="w-4 h-4" />Copied!</>
                : <><Copy className="w-4 h-4" />Copy invite link</>}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
