"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Flame } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { SubTabBar } from "@/components/ui/subtab-bar";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils/cn";

type FeedTab = "feed" | "members";
interface MemberActivity { user_id: string; username: string; avatar_url: string | null; completedTaskIds: string[]; currentStreak: number; totalHabits: number; }
interface FeedData { habits: Array<{ id: string; title: string }>; memberActivity: MemberActivity[]; }
interface GroupMember { id: string; username: string; avatar_url: string | null; role: string; }
interface GroupData { group: { id: string; name: string; description: string | null; created_by: string }; members: GroupMember[]; }
export interface GroupDetailProps { groupId: string | null; groupName?: string; isOpen: boolean; onClose: () => void; }

const nudgeTs: Record<string, number> = {};
const TABS: { id: FeedTab; label: string }[] = [{ id: "feed", label: "Feed" }, { id: "members", label: "Members" }];

function AvatarInitial({ username, size = "md" }: { username: string; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={cn("rounded-full flex items-center justify-center font-semibold text-white shrink-0", sizeClass)} style={{ backgroundColor: "var(--tab-social, #3B82F6)" }}>
      {(username.charAt(0) || "?").toUpperCase()}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-raised)]">
      <div className="w-10 h-10 rounded-full bg-[var(--color-border)] animate-pulse shrink-0" />
      <div className="flex-1 space-y-2"><div className="h-3 w-28 rounded bg-[var(--color-border)] animate-pulse" /><div className="h-2.5 w-16 rounded bg-[var(--color-border)] animate-pulse" /></div>
    </div>
  );
}

export function GroupDetail({ groupId, groupName, isOpen, onClose }: GroupDetailProps) {
  const { user } = useUser();
  const [tab, setTab] = useState<FeedTab>("feed");
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [nudgeState, setNudgeState] = useState<Record<string, "nudged" | "cooldown" | undefined>>({});
  const [friendsForInvite, setFriendsForInvite] = useState<Array<{ id: string; username: string }>>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const loadFeed = useCallback(async () => {
    if (!groupId) return;
    setFeedLoading(true);
    try { const r = await fetch(`/api/social/groups/${groupId}/feed`); if (r.ok) setFeedData(await r.json()); }
    finally { setFeedLoading(false); }
  }, [groupId]);

  const loadMembers = useCallback(async () => {
    if (!groupId) return;
    setMembersLoading(true);
    try {
      const r = await fetch(`/api/social/groups/${groupId}`);
      if (r.ok) {
        const d = await r.json();
        const rawMembers = (d.members ?? []) as Array<{ user_id: string; role: string; user?: { id: string; username: string; nickname: string; avatar_url: string | null } | null }>;
        setGroupData({ group: d.group, members: rawMembers.map((m) => ({ id: m.user_id, username: m.user?.username ?? m.user?.nickname ?? "Unknown", avatar_url: m.user?.avatar_url ?? null, role: m.role })) });
      }
    } finally { setMembersLoading(false); }
  }, [groupId]);

  useEffect(() => {
    if (!isOpen || !groupId) return;
    loadFeed(); loadMembers();
    const supabase = createClient();
    const channel = supabase.channel(`group-feed-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_completions" }, () => { loadFeed(); })
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [isOpen, groupId, loadFeed, loadMembers]);

  useEffect(() => { setFeedData(null); setGroupData(null); setShowInvite(false); setNudgeState({}); setTab("feed"); }, [groupId]);

  const handleNudge = async (targetUserId: string) => {
    const now = Date.now();
    const last = nudgeTs[targetUserId];
    if (last && now - last < 5 * 60 * 1000) { setNudgeState((prev) => ({ ...prev, [targetUserId]: "cooldown" })); return; }
    nudgeTs[targetUserId] = now;
    setNudgeState((prev) => ({ ...prev, [targetUserId]: "nudged" }));
    await fetch("/api/social/nudge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target_user_id: targetUserId }) });
    setTimeout(() => { setNudgeState((prev) => { const n = { ...prev }; delete n[targetUserId]; return n; }); }, 2000);
  };

  const loadFriendsForInvite = useCallback(async () => {
    const r = await fetch("/api/social/friends");
    if (!r.ok) return;
    const d = await r.json();
    const alreadyIn = new Set((groupData?.members ?? []).map((m) => m.id));
    setFriendsForInvite((d.friends ?? []).filter((f: { id: string; username: string }) => !alreadyIn.has(f.id)));
  }, [groupData]);

  const handleInvite = async (friendId: string) => {
    if (!groupId) return;
    setInviting(friendId);
    const r = await fetch(`/api/social/groups/${groupId}/invite`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: friendId }) });
    setInviting(null);
    if (r.ok) { setFriendsForInvite((prev) => prev.filter((f) => f.id !== friendId)); setShowInvite(false); }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!groupId) return;
    setGroupData((prev) => prev ? { ...prev, members: prev.members.filter((m) => m.id !== userId) } : prev);
    await fetch(`/api/social/groups/${groupId}/members/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove" }) });
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "member") => {
    if (!groupId) return;
    setGroupData((prev) => prev ? { ...prev, members: prev.members.map((m) => (m.id === userId ? { ...m, role: newRole } : m)) } : prev);
    await fetch(`/api/social/groups/${groupId}/members/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: newRole }) });
  };

  const isOwner = !!user && groupData?.group?.created_by === user.id;
  const displayName = groupName ?? groupData?.group?.name ?? "Group";

  return (
    <>
      <div className={cn("fixed inset-0 bg-black/40 z-[200] transition-opacity", isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")} onClick={onClose} />
      <div className={cn("fixed inset-y-0 right-0 w-full max-w-md bg-[var(--color-bg)] z-[210] flex flex-col transition-transform duration-300", isOpen ? "translate-x-0" : "translate-x-full pointer-events-none")}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--color-border)] shrink-0">
          <h2 className="font-semibold text-base text-[var(--color-text-primary)] truncate">{displayName}</h2>
          <button onClick={onClose} className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"><X className="w-5 h-5" /></button>
        </div>
        <SubTabBar tabs={TABS} active={tab} onChange={setTab} accentColor="var(--tab-social, #3B82F6)" className="shrink-0" />
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {tab === "feed" && (
            feedLoading && !feedData ? (<><SkeletonCard /><SkeletonCard /><SkeletonCard /></>) :
            (feedData?.memberActivity ?? []).length === 0 ? (<p className="text-sm text-[var(--color-text-secondary)] text-center py-12">No activity yet.</p>) :
            (feedData?.memberActivity ?? []).map((m) => {
              const nudgeSt = nudgeState[m.user_id];
              const isMe = m.user_id === user?.id;
              return (
                <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-raised)]">
                  <AvatarInitial username={m.username} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">@{m.username}</p><p className="text-xs text-[var(--color-text-secondary)]">{m.completedTaskIds.length} of {m.totalHabits} done</p></div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {m.currentStreak > 0 && (<div className="flex items-center gap-0.5"><Flame className="w-3.5 h-3.5 text-[#EF4444]" /><span className="text-xs font-medium text-[var(--color-text-secondary)]">{m.currentStreak}</span></div>)}
                    {!isMe && (
                      <button onClick={() => handleNudge(m.user_id)} disabled={nudgeSt === "cooldown"}
                        className={cn("text-[10px] px-2 py-1 rounded-full border transition-colors",
                          nudgeSt === "nudged" ? "text-green-600 border-green-300" :
                          nudgeSt === "cooldown" ? "text-[var(--color-text-disabled)] border-[var(--color-border)] cursor-not-allowed opacity-50" :
                          "text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]")}>
                        {nudgeSt === "nudged" ? "Nudged!" : nudgeSt === "cooldown" ? "Already nudged" : "Nudge"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {tab === "members" && (
            membersLoading && !groupData ? (<><SkeletonCard /><SkeletonCard /></>) : (
              <>
                {isOwner && (
                  <div className="mb-1">
                    <button onClick={() => { setShowInvite((v) => !v); if (!showInvite) loadFriendsForInvite(); }} className="text-xs px-3 py-1.5 rounded-full border font-medium" style={{ borderColor: "var(--tab-social)", color: "var(--tab-social)" }}>+ Invite friend</button>
                    {showInvite && (
                      <div className="mt-2 space-y-1.5 pl-1">
                        {friendsForInvite.length === 0 ? (<p className="text-xs text-[var(--color-text-secondary)]">No eligible friends to invite.</p>) :
                          friendsForInvite.map((f) => (
                            <div key={f.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--color-surface-raised)]">
                              <span className="text-sm text-[var(--color-text-primary)]">@{f.username}</span>
                              <button onClick={() => handleInvite(f.id)} disabled={inviting === f.id} className="text-xs text-white px-2.5 py-1 rounded-full disabled:opacity-50" style={{ backgroundColor: "var(--tab-social, #3B82F6)" }}>{inviting === f.id ? "…" : "Invite"}</button>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                )}
                {(groupData?.members ?? []).map((m) => {
                  const isGroupOwner = groupData?.group?.created_by === m.id;
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-raised)]">
                      <AvatarInitial username={m.username} size="sm" />
                      <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">@{m.username}</p><span className="text-[10px] capitalize text-[var(--color-text-secondary)]">{m.role}</span></div>
                      {isOwner && !isGroupOwner && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => handleRoleChange(m.id, m.role === "admin" ? "member" : "admin")} className="text-[10px] px-2 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)]">{m.role === "admin" ? "→ Member" : "→ Admin"}</button>
                          <button onClick={() => handleRemoveMember(m.id)} className="text-[10px] px-2 py-1 rounded-full border border-red-300 text-red-500">Remove</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )
          )}
        </div>
      </div>
    </>
  );
}
