#!/usr/bin/env bash
# apply-major-ux-fixes.sh
# Applies: flame loader, filter bar reorder, Guest display name,
#          activity form overhaul (date/time/reminders/assignees),
#          records dropdown, streaks underline tabs, social full-screen modals,
#          profile page cleanup, password constraint checklist,
#          Social API fix (friends via admin API), PWA SVG icon,
#          schema: snooze_minutes + loop_count + profiles table.
#
# Run: chmod +x apply-major-ux-fixes.sh && ./apply-major-ux-fixes.sh
set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

mkdir -p 'lib/utils'
cat > 'lib/utils/display-name.ts' << 'FILEEOF'
/** Returns a stable display name. Falls back to "Guest{5-digit}" derived from the user's UUID. */
export function getDisplayName(user: { username?: string; id: string }): string {
  if (user.username?.trim()) return user.username.trim();
  const hex = user.id.replace(/-/g, "").slice(-8);
  const num = (parseInt(hex, 16) % 90000) + 10000; // always 10000-99999
  return `Guest${num}`;
}

export function getInitials(displayName: string): string {
  return displayName.slice(0, 2).toUpperCase();
}
FILEEOF

mkdir -p 'components/ui'
cat > 'components/ui/spinner.tsx' << 'FILEEOF'
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type SpinnerSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-flex items-center justify-center", className)}
    >
      <Flame
        className={cn(
          SIZE_CLASSES[size],
          "text-[var(--color-brand)] animate-[flame-pulse_1.2s_ease-in-out_infinite]"
        )}
      />
    </span>
  );
}
FILEEOF

mkdir -p 'components/layout'
cat > 'components/layout/search-filter-bar.tsx' << 'FILEEOF'
"use client";
import { X, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type SortDir = "asc" | "desc";

interface SearchFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  showGoals: boolean;
  onToggleGoals: () => void;
  goalSort: SortDir;
  onToggleGoalSort: () => void;
  showActivities: boolean;
  onToggleActivities: () => void;
  activitySort: SortDir;
  onToggleActivitySort: () => void;
  className?: string;
}

export function SearchFilterBar({
  search, onSearchChange,
  showGoals, onToggleGoals, goalSort, onToggleGoalSort,
  showActivities, onToggleActivities, activitySort, onToggleActivitySort,
  className,
}: SearchFilterBarProps) {
  return (
    <div className={cn("space-y-2 mb-4", className)}>
      {/* Search row */}
      <div className="relative">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Searchâ€¦"
          className="w-full pl-3 pr-8 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter row: < sort > [ Goals ] [ Activities ] < sort > */}
      <div className="flex items-center gap-1.5">
        {/* Goals sort */}
        <button
          onClick={onToggleGoalSort}
          className={cn(
            "p-1.5 rounded-[var(--radius-sm)] border transition-colors shrink-0",
            showGoals
              ? "border-orange-400 bg-orange-500 text-white"
              : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
          )}
          aria-label={`Sort goals ${goalSort === "asc" ? "descending" : "ascending"}`}
        >
          {goalSort === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
        </button>

        {/* Goals pill */}
        <button
          onClick={onToggleGoals}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border transition-colors",
            showGoals
              ? "bg-orange-500 border-orange-500 text-white"
              : "bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
          )}
        >
          Goals
        </button>

        {/* Activities pill */}
        <button
          onClick={onToggleActivities}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border transition-colors",
            showActivities
              ? "bg-green-500 border-green-500 text-white"
              : "bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
          )}
        >
          Activities
        </button>

        {/* Activities sort */}
        <button
          onClick={onToggleActivitySort}
          className={cn(
            "p-1.5 rounded-[var(--radius-sm)] border transition-colors shrink-0",
            showActivities
              ? "border-green-400 bg-green-500 text-white"
              : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
          )}
          aria-label={`Sort activities ${activitySort === "asc" ? "descending" : "ascending"}`}
        >
          {activitySort === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

FILEEOF

mkdir -p 'components/layout'
cat > 'components/layout/header.tsx' << 'FILEEOF'
"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import { getDisplayName, getInitials } from "@/lib/utils/display-name";

export function Header() {
  const { user } = useUser();

  const displayName = user ? getDisplayName(user) : "…";
  const initials = getInitials(displayName);

  return (
    <header className="sticky top-0 z-[200] w-full bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border)]">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-[var(--color-brand)]" aria-hidden="true" />
          <span className="font-semibold text-[var(--color-text-primary)] tracking-tight">
            Streaks
          </span>
        </div>

        {/* User avatar + name → profile edit */}
        <Link
          href="/settings/profile"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label="Edit profile"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--color-brand)] flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          <span className="text-sm font-medium text-[var(--color-text-primary)] max-w-[120px] truncate hidden sm:block">
            {displayName}
          </span>
        </Link>
      </div>
    </header>
  );
}
FILEEOF

mkdir -p 'components/goals'
cat > 'components/goals/goal-form-dialog.tsx' << 'FILEEOF'
"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/lib/hooks/use-user";
import { DAY_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/types";
import type { Goal } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface Props {
  goal?: Partial<Goal>;
  onClose: () => void;
  onSaved: () => void;
}

export function GoalFormDialog({ goal, onClose, onSaved }: Props) {
  const isEdit = !!goal?.id;
  const { user } = useUser();
  const defaultDays = goal?.active_days ?? user?.default_active_days ?? [0, 1, 2, 3, 4, 5, 6];
  const [title, setTitle] = useState(goal?.title ?? "");
  const [desc, setDesc] = useState(goal?.description ?? "");
  const [activeDays, setActiveDays] = useState<number[]>(defaultDays);
  const [priority, setPriority] = useState(goal?.priority ?? 3);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const toggleDay = (d: number) =>
    setActiveDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return showToast("Title is required", "error");
    if (!activeDays.length) return showToast("Select at least one day", "error");
    setLoading(true);
    const body = {
      title: title.trim(),
      description: desc || undefined,
      active_days: activeDays,
      priority,
      tag_ids: [],
    };
    const r = await fetch(isEdit ? `/api/goals/${goal!.id}` : "/api/goals", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!r.ok) { const d = await r.json(); showToast(d.error ?? "Save failed", "error"); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--color-surface-raised)] rounded-[var(--radius-2xl)] w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-text-primary)]">{isEdit ? "Edit Goal" : "New Goal"}</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)]"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="g-title">Title *</Label>
            <Input id="g-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Morning Run" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-desc">Description</Label>
            <textarea id="g-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} maxLength={500}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] resize-none" />
          </div>

          <div className="space-y-1.5">
            <Label>Active days *</Label>
            <div className="flex gap-1.5 flex-wrap">
              {DAY_LABELS.map((d, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                    activeDays.includes(i)
                      ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white"
                      : "bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
                  )}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Priority</Label>
              <span className="text-xs font-semibold" style={{ color: PRIORITY_COLORS[priority] }}>
                {PRIORITY_LABELS[priority]}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) as 1|2|3|4|5)}
              className="w-full accent-[var(--color-brand)] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[var(--color-text-secondary)] px-0.5">
              {[1,2,3,4,5].map((p) => <span key={p}>{PRIORITY_LABELS[p]}</span>)}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1">{isEdit ? "Save" : "Create"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}


interface Props {
  goal?: Partial<Goal>;
  onClose: () => void;
  onSaved: () => void;
}
FILEEOF

mkdir -p 'components/records'
cat > 'components/records/record-form-dialog.tsx' << 'FILEEOF'
"use client";
import { useState, useEffect } from "react";
import { X, Calendar, Clock, Bell, Users, Tag, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTags } from "@/lib/hooks/use-tags";
import { useToast } from "@/components/ui/toast";
import { PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/types";
import type { Activity } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";

interface Friend { id: string; username: string; }

interface Props {
  type: "goal" | "activity";
  activity?: Partial<Activity>;
  prefill?: { assignee_user_id?: string; group_id?: string; assignee_label?: string };
  onClose: () => void;
  onSaved: () => void;
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      <span className="text-[var(--color-text-secondary)]">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">{label}</span>
      <div className="flex-1 h-px bg-[var(--color-border)]" />
    </div>
  );
}

export function RecordFormDialog({ type, activity, prefill, onClose, onSaved }: Props) {
  if (type === "goal") return <GoalFormDialog onClose={onClose} onSaved={onSaved} />;

  const isEdit = !!activity?.id;
  const [title, setTitle] = useState(activity?.title ?? "");
  const [desc, setDesc] = useState(activity?.description ?? "");
  const [date, setDate] = useState(activity?.activity_date ?? "");
  const [time, setTime] = useState(activity?.activity_time ?? "");
  const [priority, setPriority] = useState<1|2|3|4|5>(activity?.priority ?? 3);
  const [selectedTags, setSelectedTags] = useState<string[]>(activity?.tag_ids ?? []);
  const [snoozeMin, setSnoozeMin] = useState(15);
  const [loopCount, setLoopCount] = useState(1);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>(
    prefill?.assignee_user_id ? [prefill.assignee_user_id] : []
  );
  const [loading, setLoading] = useState(false);
  const { tags } = useTags();
  const { showToast } = useToast();

  useEffect(() => {
    fetch("/api/social/friends")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.friends) setFriends(d.friends); });
  }, []);

  const toggleTag = (id: string) =>
    setSelectedTags((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleFriend = (id: string) =>
    setSelectedFriends((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return showToast("Title is required", "error");
    setLoading(true);

    const baseBody = {
      title: title.trim(),
      description: desc || undefined,
      activity_date: date || null,
      activity_time: time || null,
      priority,
      tag_ids: selectedTags,
      snooze_minutes: snoozeMin,
      loop_count: loopCount,
      ...(prefill?.group_id ? { group_id: prefill.group_id } : {}),
    };

    if (isEdit) {
      const r = await fetch(`/api/activities/${activity!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseBody),
      });
      setLoading(false);
      if (!r.ok) { const d = await r.json(); showToast(d.error ?? "Save failed", "error"); return; }
      onSaved();
      return;
    }

    // New activity: create one per selected friend (or self if none selected)
    const targets = selectedFriends.length > 0 ? selectedFriends : [null];
    const results = await Promise.all(
      targets.map((uid) =>
        fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...baseBody, ...(uid ? { assignee_user_id: uid } : {}) }),
        })
      )
    );

    setLoading(false);
    const anyFailed = results.some((r) => !r.ok);
    if (anyFailed) { showToast("Some activities could not be saved", "error"); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--color-surface-raised)] rounded-[var(--radius-2xl)] w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-surface-raised)] z-10">
          <h2 className="font-semibold text-[var(--color-text-primary)]">
            {isEdit ? "Edit Activity" : "New Activity"}
          </h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-5">

          {/* â”€â”€ Details â”€â”€ */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="a-title">Title *</Label>
              <Input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Team meeting" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-desc">Description</Label>
              <textarea id="a-desc" value={desc} onChange={(e) => setDesc(e.target.value)}
                rows={2} maxLength={500}
                className="w-full px-3 py-2 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] resize-none" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Priority</Label>
                <span className="text-xs font-semibold" style={{ color: PRIORITY_COLORS[priority] }}>
                  {PRIORITY_LABELS[priority]}
                </span>
              </div>
              <input type="range" min={1} max={5} step={1} value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as 1|2|3|4|5)}
                className="w-full accent-[var(--color-brand)] cursor-pointer" />
              <div className="flex justify-between text-[10px] text-[var(--color-text-secondary)] px-0.5">
                {[1,2,3,4,5].map((p) => <span key={p}>{PRIORITY_LABELS[p]}</span>)}
              </div>
            </div>
          </div>

          {/* â”€â”€ Schedule â”€â”€ */}
          <div className="space-y-3">
            <SectionHeader icon={<Calendar className="w-3.5 h-3.5" />} label="Schedule" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="a-date">Date</Label>
                <div className="relative">
                  <Input id="a-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pr-8" />
                  <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-secondary)] pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-time">Time</Label>
                <div className="relative">
                  <Input id="a-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="pr-8" />
                  <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-secondary)] pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* â”€â”€ Reminders â”€â”€ */}
          <div className="space-y-3">
            <SectionHeader icon={<Bell className="w-3.5 h-3.5" />} label="Reminders" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="a-snooze">Snooze (min)</Label>
                <Input id="a-snooze" type="number" min={1} max={1440} value={snoozeMin}
                  onChange={(e) => setSnoozeMin(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="15" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-loop">Loop (times)</Label>
                <Input id="a-loop" type="number" min={1} max={99} value={loopCount}
                  onChange={(e) => setLoopCount(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="1" />
              </div>
            </div>
            <p className="text-[10px] text-[var(--color-text-secondary)]">
              Repeat reminder every {snoozeMin} min, {loopCount} time{loopCount !== 1 ? "s" : ""}.
            </p>
          </div>

          {/* â”€â”€ Assign To â”€â”€ */}
          {!isEdit && friends.length > 0 && (
            <div className="space-y-3">
              <SectionHeader icon={<Users className="w-3.5 h-3.5" />} label="Assign To" />
              <div className="space-y-1 max-h-32 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                {friends.map((f) => (
                  <label key={f.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-secondary)] transition-colors">
                    <input type="checkbox" checked={selectedFriends.includes(f.id)}
                      onChange={() => toggleFriend(f.id)}
                      className="accent-[var(--color-brand)] w-4 h-4 shrink-0" />
                    <span className="text-sm text-[var(--color-text-primary)]">{f.username}</span>
                  </label>
                ))}
              </div>
              {selectedFriends.length > 0 && (
                <p className="text-[10px] text-[var(--color-text-secondary)]">
                  Creates 1 activity for each selected person.
                </p>
              )}
            </div>
          )}

          {/* â”€â”€ Tags â”€â”€ */}
          <div className="space-y-3">
            <SectionHeader icon={<Tag className="w-3.5 h-3.5" />} label="Tags" />
            {tags.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)]">No tags configured yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {tags.map((t) => (
                  <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs border transition-colors",
                      selectedTags.includes(t.id)
                        ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white"
                        : "bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
                    )}>
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1">
              {isEdit ? "Save" : selectedFriends.length > 1 ? `Create (${selectedFriends.length})` : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


interface Props {
  type: "goal" | "activity";
  activity?: Partial<Activity>;
  prefill?: { assignee_user_id?: string; group_id?: string; assignee_label?: string };
  onClose: () => void;
  onSaved: () => void;
}
FILEEOF

mkdir -p 'components/goals'
cat > 'components/goals/goals-list.tsx' << 'FILEEOF'
"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Flame, Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { StreakCard } from "@/components/streaks/streak-card";
import type { GoalWithStreak } from "@/lib/types";
import type { SortDir } from "@/components/layout/search-filter-bar";

export function GoalsList({ onAddNew, search = "", sortDir = "asc", onHasData }: {
  onAddNew: () => void;
  search?: string;
  sortDir?: SortDir;
  onHasData?: (has: boolean) => void;
}) {
  const [goals, setGoals] = useState<GoalWithStreak[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/goals?streaks=true");
    if (r.ok) { const d = await r.json(); const list = d.goals ?? []; setGoals(list); onHasData?.(list.length > 0); }
    setLoading(false);
  }, [onHasData]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = goals;
    if (search) list = list.filter((g) => g.title.toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a, b) =>
      sortDir === "asc" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
    );
  }, [goals, search, sortDir]);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  if (!filtered.length) return (
    <div className="text-center py-12 text-[var(--color-text-secondary)]">
      <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-medium">{search ? "No goals match your search" : "No goals yet"}</p>
      {!search && <Button size="sm" className="mt-3" onClick={onAddNew} leftIcon={<Plus className="w-4 h-4" />}>Add Goal</Button>}
    </div>
  );

  return <div className="space-y-3">{filtered.map((g) => <StreakCard key={g.id} goal={g} onUpdate={load} />)}</div>;
}
FILEEOF

mkdir -p 'components/activities'
cat > 'components/activities/activities-list.tsx' << 'FILEEOF'
"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Activity, Plus, CheckCircle2, Clock, Circle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { PRIORITY_COLORS } from "@/lib/types";
import type { Activity as ActivityType } from "@/lib/types";
import type { SortDir } from "@/components/layout/search-filter-bar";
import { cn } from "@/lib/utils/cn";
import { RecordFormDialog } from "@/components/records/record-form-dialog";

export function ActivitiesList({ onAddNew, search = "", sortDir = "asc", onHasData }: {
  onAddNew: () => void;
  search?: string;
  sortDir?: SortDir;
  onHasData?: (has: boolean) => void;
}) {
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ActivityType | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/activities");
    if (r.ok) { const d = await r.json(); const list = d.activities ?? []; setActivities(list); onHasData?.(list.length > 0); }
    setLoading(false);
  }, [onHasData]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = activities;
    if (search) list = list.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a, b) =>
      sortDir === "asc" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
    );
  }, [activities, search, sortDir]);

  const statusColor = (s: string) =>
    s === "completed" ? "text-[var(--color-success)]" :
    s === "pending"   ? "text-[var(--color-warning)]" :
    s === "rejected"  ? "text-[var(--color-error)]" : "text-[var(--color-text-secondary)]";

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  if (!filtered.length) return (
    <div className="text-center py-12 text-[var(--color-text-secondary)]">
      <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-medium">{search ? "No activities match your search" : "No activities yet"}</p>
      {!search && <Button size="sm" className="mt-3" onClick={onAddNew} leftIcon={<Plus className="w-4 h-4" />}>Add Activity</Button>}
    </div>
  );

  return (
    <>
      <div className="space-y-3">
        {filtered.map((a) => (
          <div key={a.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-3 cursor-pointer hover:border-[var(--color-border-strong)]"
            onClick={() => setEditing(a)}>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 shrink-0">
                {a.status === "completed"
                  ? <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                  : <Circle className="w-4 h-4 text-[var(--color-text-disabled)]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{a.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: PRIORITY_COLORS[a.priority] + "22", color: PRIORITY_COLORS[a.priority] }}>
                    P{a.priority}
                  </span>
                  <span className={cn("text-[10px] font-medium capitalize", statusColor(a.status))}>{a.status}</span>
                </div>
                {a.description && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">{a.description}</p>}
                {(a.activity_date || a.activity_time) && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-[var(--color-text-secondary)]">
                    <Clock className="w-3 h-3" />
                    {a.activity_date} {a.activity_time ?? ""}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <RecordFormDialog type="activity" activity={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </>
  );
}
FILEEOF

mkdir -p 'app/(protected)/records'
cat > 'app/(protected)/records/page.tsx' << 'FILEEOF'
"use client";
import { useState, useRef, useEffect } from "react";
import { Plus, Flame, Activity, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SearchFilterBar, type SortDir } from "@/components/layout/search-filter-bar";
import { RecordFormDialog } from "@/components/records/record-form-dialog";
import { GoalsList } from "@/components/goals/goals-list";
import { ActivitiesList } from "@/components/activities/activities-list";
import { TAB_COLORS } from "@/lib/types";

const GREEN = "#22C55E";

function NewDropdown({ onOpen }: { onOpen: (type: "goal" | "activity") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        size="sm"
        style={{ backgroundColor: GREEN, borderColor: GREEN }}
        onClick={() => setOpen((v) => !v)}
        leftIcon={<Plus className="w-4 h-4" />}
        rightIcon={<ChevronDown className="w-3.5 h-3.5" />}
      >
        New
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-lg overflow-hidden">
          <button
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-[var(--color-bg-secondary)] transition-colors"
            onClick={() => { setOpen(false); onOpen("goal"); }}
          >
            <Flame className="w-4 h-4 text-orange-500" /> Goal
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-[var(--color-bg-secondary)] transition-colors"
            onClick={() => { setOpen(false); onOpen("activity"); }}
          >
            <Activity className="w-4 h-4 text-green-500" /> Activity
          </button>
        </div>
      )}
    </div>
  );
}

export default function RecordsPage() {
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"goal" | "activity">("goal");
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasRecords, setHasRecords] = useState<boolean | null>(null); // null = unknown

  const [search, setSearch] = useState("");
  const [showGoals, setShowGoals] = useState(true);
  const [goalSort, setGoalSort] = useState<SortDir>("asc");
  const [showActivities, setShowActivities] = useState(true);
  const [activitySort, setActivitySort] = useState<SortDir>("asc");

  const openForm = (type: "goal" | "activity") => {
    setFormType(type);
    setShowForm(true);
  };

  const onSaved = () => {
    setShowForm(false);
    setHasRecords(true);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div>
      <PageHeader
        title="Records"
        subtitle="Goals & Activities"
        accentColor={GREEN}
        right={hasRecords ? <NewDropdown onOpen={openForm} /> : undefined}
      />

      {hasRecords !== false && (
        <SearchFilterBar
          search={search} onSearchChange={setSearch}
          showGoals={showGoals} onToggleGoals={() => setShowGoals((v) => !v)}
          goalSort={goalSort} onToggleGoalSort={() => setGoalSort((v) => v === "asc" ? "desc" : "asc")}
          showActivities={showActivities} onToggleActivities={() => setShowActivities((v) => !v)}
          activitySort={activitySort} onToggleActivitySort={() => setActivitySort((v) => v === "asc" ? "desc" : "asc")}
        />
      )}

      {showGoals && (
        <div className="mb-5">
          <GoalsList
            key={`goals-${refreshKey}`}
            onAddNew={() => openForm("goal")}
            search={search}
            sortDir={goalSort}
            onHasData={(v) => setHasRecords((prev) => prev === true ? true : v)}
          />
        </div>
      )}

      {showActivities && (
        <ActivitiesList
          key={`acts-${refreshKey}`}
          onAddNew={() => openForm("activity")}
          search={search}
          sortDir={activitySort}
          onHasData={(v) => setHasRecords((prev) => prev === true ? true : v)}
        />
      )}

      {/* Empty state â€” only show when both lists report no data */}
      {hasRecords === false && !showForm && (
        <div className="flex flex-col items-center gap-5 py-16 text-center">
          <p className="text-[var(--color-text-secondary)] text-sm">No records yet. Add your first one!</p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => openForm("goal")}
              leftIcon={<Flame className="w-4 h-4 text-orange-500" />}
            >
              New Goal
            </Button>
            <Button
              style={{ backgroundColor: GREEN, borderColor: GREEN }}
              onClick={() => openForm("activity")}
              leftIcon={<Activity className="w-4 h-4" />}
            >
              New Activity
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <RecordFormDialog
          type={formType}
          onClose={() => setShowForm(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

FILEEOF

mkdir -p 'app/(protected)/streaks'
cat > 'app/(protected)/streaks/page.tsx' << 'FILEEOF'
"use client";
import { useState, useEffect, useCallback } from "react";
import { Flame, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Spinner } from "@/components/ui/spinner";
import { StreakCard } from "@/components/streaks/streak-card";
import { ReportsView } from "@/components/streaks/reports-view";
import { TAB_COLORS } from "@/lib/types";
import type { GoalWithStreak } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type SubTab = "streaks" | "reports";

export default function StreaksPage() {
  const [goals, setGoals] = useState<GoalWithStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>("streaks");

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/goals?streaks=true&active=true");
    if (r.ok) { const d = await r.json(); setGoals(d.goals ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const TABS: { id: SubTab; icon: React.ReactNode; label: string }[] = [
    { id: "streaks", icon: <Flame className="w-4 h-4" />, label: "Streaks" },
    { id: "reports", icon: <TrendingUp className="w-4 h-4" />, label: "Reports" },
  ];

  return (
    <div>
      <PageHeader
        title="Streaks"
        subtitle="Your recurring goals"
        accentColor={TAB_COLORS.streaks}
      />

      {/* Sub-tabs â€” underline style */}
      <div className="flex border-b border-[var(--color-border)] mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              subTab === t.id
                ? "border-[var(--color-brand)] text-[var(--color-brand)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "streaks" && (
        loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-text-secondary)]">
            <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No active goals</p>
            <p className="text-sm mt-1">Create your first goal to start a streak</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => (
              <StreakCard key={g.id} goal={g} onUpdate={fetchGoals} />
            ))}
          </div>
        )
      )}

      {subTab === "reports" && <ReportsView />}
    </div>
  );
}

FILEEOF

mkdir -p 'app/(protected)/social'
cat > 'app/(protected)/social/page.tsx' << 'FILEEOF'
"use client";
import { useState } from "react";
import { UserCheck, Shield, UserPlus, Bell } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { TAB_COLORS } from "@/lib/types";
import { FriendsList } from "@/components/social/friends-list";
import { GroupsList } from "@/components/social/groups-list";
import { NotificationsList } from "@/components/social/notifications-list";
import { FindFriends } from "@/components/social/find-friends";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { cn } from "@/lib/utils/cn";

type Modal = "find" | "notifications" | null;
type SubTab = "friends" | "groups";

export default function SocialPage() {
  const [subTab, setSubTab] = useState<SubTab>("friends");
  const [modal, setModal] = useState<Modal>(null);
  const { unreadCount } = useNotifications();

  return (
    <div>
      <PageHeader
        title="Social"
        accentColor={TAB_COLORS.social}
        right={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setModal(modal === "find" ? null : "find")}
              className={cn(
                "p-2 rounded-full transition-colors",
                modal === "find"
                  ? "bg-[var(--color-social-light,#EFF6FF)] text-blue-500"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
              )}
              aria-label="Find friends"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setModal(modal === "notifications" ? null : "notifications")}
              className={cn(
                "relative p-2 rounded-full transition-colors",
                modal === "notifications"
                  ? "bg-[var(--color-social-light,#EFF6FF)] text-blue-500"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
              )}
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--color-error)] text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        }
      />

      {modal === "find" && (
        <div className="mt-2">
          <FindFriends />
        </div>
      )}
      {modal === "notifications" && (
        <div className="mt-2">
          <NotificationsList />
        </div>
      )}

      {/* Sub-tabs + content — hidden when a modal screen is active */}
      {!modal && (
        <>
          <div className="flex border-b border-[var(--color-border)] mb-4">
        {(["friends", "groups"] as SubTab[]).map((tab) => {
          const Icon = tab === "friends" ? UserCheck : Shield;
          const label = tab === "friends" ? "Friends" : "Groups";
          return (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                subTab === tab
                  ? "border-blue-500 text-blue-500"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      {subTab === "friends" && <FriendsList />}
      {subTab === "groups"  && <GroupsList />}
        </>
      )}
    </div>
  );
}
FILEEOF

mkdir -p 'app/(protected)/settings/profile'
cat > 'app/(protected)/settings/profile/page.tsx' << 'FILEEOF'
"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/lib/hooks/use-user";
import { getDisplayName, getInitials } from "@/lib/utils/display-name";

export default function ProfilePage() {
  const router = useRouter();
  const { user, refetch } = useUser();
  const { showToast } = useToast();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username ?? "");
      setBio(user.bio ?? "");
    }
  }, [user]);

  const displayName = user ? getDisplayName(user) : "â€¦";
  const initials = getInitials(displayName);

  const handleSave = async () => {
    setLoading(true);
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), bio: bio.trim() }),
    });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) {
      showToast(d.error ?? "Save failed", "error");
    } else {
      showToast("Profile saved", "success");
      await refetch();
      setDirty(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Edit Profile</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8 gap-2">
        <div className="w-20 h-20 rounded-full bg-[var(--color-brand)] flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{initials}</span>
        </div>
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{displayName}</p>
      </div>

      <div className="space-y-5">
        {/* Username */}
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setDirty(true); }}
            placeholder="Enter a username"
            maxLength={50}
          />
          <p className="text-xs text-[var(--color-text-secondary)]">Your display name across the app.</p>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => { setBio(e.target.value); setDirty(true); }}
            rows={3}
            maxLength={200}
            placeholder="A short description about yourself"
            className="w-full px-3 py-2 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] resize-none"
          />
          <p className="text-xs text-[var(--color-text-secondary)]">{bio.length}/200</p>
        </div>

        {/* Save */}
        <div className="pt-2">
          <Button
            type="button"
            className="w-full"
            loading={loading}
            disabled={!dirty}
            onClick={handleSave}
            leftIcon={<Check className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

FILEEOF

mkdir -p 'app/(auth)/register'
cat > 'app/(auth)/register/page.tsx' << 'FILEEOF'
"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { Flame, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { showToast } = useToast();

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        showToast(error.message, "error");
      } else {
        showToast("Confirmation email resent", "success");
        setResendCooldown(60);
        const interval = setInterval(() => {
          setResendCooldown((c) => {
            if (c <= 1) { clearInterval(interval); return 0; }
            return c - 1;
          });
        }, 1000);
      }
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (password.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }
    if (password !== confirmPw) {
      showToast("Passwords do not match", "error");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        showToast(error.message, "error");
        return;
      }
      if (data.session) {
        window.location.href = "/today";
      } else {
        setDone(true);
      }
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)]">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--radius-2xl)] bg-[var(--color-brand-light)] mb-6">
            <Flame className="w-7 h-7 text-[var(--color-brand)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Check your email</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account.
          </p>
          <button
            onClick={handleResend}
            disabled={resendLoading || resendCooldown > 0}
            className="mt-5 text-sm text-[var(--color-brand)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendLoading
              ? "Sending..."
              : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Didn't get it? Resend email"}
          </button>
          <p className="text-sm text-[var(--color-text-secondary)] mt-4">
            Already confirmed?{" "}
            <Link href="/login" className="text-[var(--color-brand)] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--radius-2xl)] bg-[var(--color-brand-light)] mb-4">
            <Flame className="w-7 h-7 text-[var(--color-brand)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Create account</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Start building your streaks</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Real-time password constraints */}
            {password.length > 0 && (
              <ul className="mt-2 space-y-1">
                {[
                  { ok: password.length >= 8, text: "At least 8 characters" },
                  { ok: /[a-zA-Z]/.test(password), text: "Contains a letter" },
                  { ok: /[0-9]/.test(password), text: "Contains a number" },
                ].map(({ ok, text }) => (
                  <li key={text} className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-500" : "text-[var(--color-text-secondary)]"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-green-500" : "bg-[var(--color-border-strong)]"}`} />
                    {text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Re-enter password"
              required
            />
          </div>

          <Button type="submit" fullWidth loading={loading} className="mt-1">
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--color-text-secondary)] mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--color-brand)] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
FILEEOF

mkdir -p 'app/(auth)/login'
cat > 'app/(auth)/login/page.tsx' << 'FILEEOF'
"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { Flame, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        showToast(error.message, "error");
        setLoading(false);
      } else {
        window.location.href = "/today";
      }
    } catch {
      showToast("Something went wrong. Please try again.", "error");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--radius-2xl)] bg-[var(--color-brand-light)] mb-4">
            <Flame className="w-7 h-7 text-[var(--color-brand)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Welcome back</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Sign in to your Streaks account</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                data-lpignore="true"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" fullWidth loading={loading} className="mt-1">
            Sign In
          </Button>
        </form>

        <div className="flex justify-between text-sm text-[var(--color-text-secondary)] mt-4">
          <Link href="/forgot-password" className="hover:underline text-[var(--color-brand)]">
            Forgot password?
          </Link>
          <Link href="/register" className="hover:underline text-[var(--color-brand)]">
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
FILEEOF

mkdir -p 'app/api/social/friends'
cat > 'app/api/social/friends/route.ts' << 'FILEEOF'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";
import { createServiceClient } from "@/lib/supabase/service";

const requestSchema = z.object({ username: z.string().min(1) });

async function fetchUserProfiles(ids: string[]) {
  if (!ids.length) return {} as Record<string, { id: string; username: string; nickname: string }>;
  const admin = createServiceClient();
  const profiles: Record<string, { id: string; username: string; nickname: string }> = {};
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data.user) {
        const meta = data.user.user_metadata ?? {};
        profiles[id] = {
          id,
          username: meta.username ?? "",
          nickname: meta.username ?? meta.nickname ?? "User",
        };
      }
    })
  );
  return profiles;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createClient();

  const [sentRes, receivedRes] = await Promise.all([
    supabase
      .from("friendships")
      .select("id, status, auto_accept_activities, created_at, updated_at, addressee_id")
      .eq("requester_id", session.sub),
    supabase
      .from("friendships")
      .select("id, status, auto_accept_activities, created_at, updated_at, requester_id")
      .eq("addressee_id", session.sub),
  ]);

  const sent     = sentRes.data ?? [];
  const received = receivedRes.data ?? [];

  const friendIds = [
    ...sent.map((f) => f.addressee_id as string),
    ...received.map((f) => f.requester_id as string),
  ].filter(Boolean);

  const profiles = await fetchUserProfiles([...new Set(friendIds)]);

  const friendships = [
    ...sent.map((f) => ({
      ...f,
      friend: profiles[f.addressee_id] ?? { id: f.addressee_id, username: "", nickname: "Unknown" },
      is_requester: true,
    })),
    ...received.map((f) => ({
      ...f,
      friend: profiles[f.requester_id] ?? { id: f.requester_id, username: "", nickname: "Unknown" },
      is_requester: false,
    })),
  ];

  const friends = friendships
    .filter((f) => f.status === "accepted")
    .map((f) => ({ id: f.friend.id, username: f.friend.username || f.friend.nickname }));

  return NextResponse.json({ friendships, friends });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = requestSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "username required" }, { status: 400 });

  const admin = createServiceClient();
  const targetUsername = result.data.username.trim().toLowerCase();

  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const target = (usersData?.users ?? []).find(
    (u) => (u.user_metadata?.username ?? "").toLowerCase() === targetUsername
  );

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === session.sub) {
    return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(requester_id.eq.${session.sub},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${session.sub})`
    )
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") {
      return NextResponse.json({ error: "Already friends" }, { status: 409 });
    }
    if (existing.status === "pending") {
      return NextResponse.json({ error: "Request already sent" }, { status: 409 });
    }
  }

  const { data: friendship, error } = await supabase
    .from("friendships")
    .insert({ requester_id: session.sub, addressee_id: target.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("notifications").insert({
    user_id: target.id,
    type: "friend_request",
    data: { friendship_id: friendship.id },
  });

  return NextResponse.json({ friendship }, { status: 201 });
}
FILEEOF

mkdir -p 'app/api/social/groups'
cat > 'app/api/social/groups/route.ts' << 'FILEEOF'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";

const createSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(300).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, role, status")
    .eq("user_id", session.sub)
    .in("status", ["active", "pending"]);

  if (!memberships?.length) return NextResponse.json({ groups: [] });

  const groupIds = memberships.map((m) => m.group_id);
  const { data: groups } = await supabase
    .from("groups")
    .select("*, member_count:group_members(count)")
    .in("id", groupIds);

  const enriched = (groups ?? []).map((g) => {
    const m = memberships.find((m) => m.group_id === g.id);
    return { ...g, my_role: m?.role, my_status: m?.status };
  });

  return NextResponse.json({ groups: enriched });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = createSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: group, error } = await supabase
    .from("groups")
    .insert({ ...result.data, created_by: session.sub })
    .select()
    .single();

  if (error || !group) return NextResponse.json({ error: error?.message }, { status: 500 });

  await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: session.sub,
    role: "admin",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  return NextResponse.json({ group }, { status: 201 });
}
FILEEOF

mkdir -p 'app/api/activities'
cat > 'app/api/activities/route.ts' << 'FILEEOF'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const createSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  activity_date: z.string().optional().nullable(),
  activity_time: z.string().optional().nullable(),
  priority: z.number().int().min(1).max(5).default(3),
  tag_ids: z.array(z.string().uuid()).default([]),
  reminder_minutes: z.array(z.number().int().positive()).optional().nullable(),
  snooze_minutes: z.number().int().min(1).max(1440).optional().nullable(),
  loop_count: z.number().int().min(1).max(99).optional().nullable(),
  assignee_user_id: z.string().uuid().optional().nullable(),
  group_id: z.string().uuid().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const todayOnly = request.nextUrl.searchParams.get("today") === "true";
  const todayStr = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("activities")
    .select("*")
    .not("status", "eq", "rejected")
    .order("created_at", { ascending: false });

  if (todayOnly) query = query.eq("activity_date", todayStr);

  const { data: activities, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activities: activities ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = createSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const data = result.data;
  const assigneeId = data.assignee_user_id ?? session.sub;
  const isSelfAssign = assigneeId === session.sub;

  if (!isSelfAssign && !data.group_id) {
    const supabase = createServiceClient();
    const { data: friendship } = await supabase
      .from("friendships")
      .select("id, auto_accept_activities, status")
      .or(
        `and(requester_id.eq.${session.sub},addressee_id.eq.${assigneeId}),and(requester_id.eq.${assigneeId},addressee_id.eq.${session.sub})`
      )
      .eq("status", "accepted")
      .maybeSingle();

    if (!friendship) {
      return NextResponse.json(
        { error: "You can only assign activities to friends" },
        { status: 403 }
      );
    }
  }

  const supabase = await createClient();
  const status = isSelfAssign || data.group_id ? "accepted" : "pending";

  const { data: activity, error } = await supabase
    .from("activities")
    .insert({
      title: data.title,
      description: data.description,
      activity_date: data.activity_date,
      activity_time: data.activity_time,
      priority: data.priority,
      tag_ids: data.tag_ids,
      reminder_minutes: data.reminder_minutes,
      snooze_minutes: data.snooze_minutes ?? 15,
      loop_count: data.loop_count ?? 1,
      group_id: data.group_id ?? null,
      user_id: session.sub,
      assigner_user_id: session.sub,
      assignee_user_id: data.group_id ? null : assigneeId,
      status,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!isSelfAssign && !data.group_id && activity) {
    // Notification insert needs service role to write to another user's row
    try {
      const admin = createServiceClient();
      await admin.from("notifications").insert({
        user_id: assigneeId,
        type: "activity_assigned",
        payload: {
          activity_id: activity.id,
          activity_title: activity.title,
        },
      });
    } catch { /* non-critical */ }
  }

  return NextResponse.json({ activity }, { status: 201 });
}
FILEEOF

mkdir -p 'app/api/activities/[id]'
cat > 'app/api/activities/[id]/route.ts' << 'FILEEOF'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  activity_date: z.string().nullable().optional(),
  activity_time: z.string().nullable().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
  reminder_minutes: z.array(z.number().int().positive()).nullable().optional(),
  snooze_minutes: z.number().int().min(1).max(1440).nullable().optional(),
  loop_count: z.number().int().min(1).max(99).nullable().optional(),
  /** Pass toggle_complete: true to flip the completed status */
  toggle_complete: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const supabase = await createClient();
  const { toggle_complete, ...fields } = result.data;

  if (toggle_complete) {
    const { data: current } = await supabase
      .from("activities")
      .select("id, status")
      .eq("id", id)
      .single();
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const newStatus = current.status === "completed" ? "accepted" : "completed";
    await supabase.from("activities").update({ status: newStatus }).eq("id", id);
    return NextResponse.json({ completed: newStatus === "completed" });
  }

  const { data: activity, error } = await supabase
    .from("activities")
    .update({ ...fields })
    .eq("id", id)
    .select()
    .single();

  if (error || !activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ activity });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
FILEEOF

mkdir -p 'public'
cat > 'public/manifest.json' << 'FILEEOF'
{
  "name": "Streaks",
  "short_name": "Streaks",
  "description": "Build consistent daily habits with visual streak tracking",
  "start_url": "/today",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#F07F13",
  "orientation": "portrait-primary",
  "categories": ["lifestyle", "productivity"],
  "icons": [
    {
      "src": "/icons/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    {
      "src": "/icons/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Today's Tasks",
      "short_name": "Today",
      "description": "View and complete today's scheduled tasks",
      "url": "/today",
      "icons": [{ "src": "/icons/icon.svg", "sizes": "any", "type": "image/svg+xml" }]
    }
  ]
}
FILEEOF

mkdir -p 'public/icons'
cat > 'public/icons/icon.svg' << 'FILEEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#F07F13"/>
  <path
    d="M256 80 c0 0 80 90 80 160 c0 30 -10 55 -28 73
       c8 -30 -10 -55 -30 -70 c0 40 -20 70 -55 90
       c15 -25 5 -55 -10 -75 c-15 25 -25 55 -15 90
       c-30 -20 -50 -55 -50 -100 c0 -60 40 -110 60 -168 z"
    fill="white"
    stroke="white"
    stroke-width="4"
    stroke-linejoin="round"
    fill-rule="nonzero"
    opacity="0.95"
  />
  <path
    d="M256 220 c0 0 40 45 40 80 c0 25 -18 46 -40 55
       c-22 -9 -40 -30 -40 -55 c0 -35 40 -80 40 -80 z"
    fill="#FDE7C5"
    opacity="0.8"
  />
</svg>
FILEEOF

mkdir -p 'supabase'
cat > 'supabase/schema.sql' << 'FILEEOF'
-- =============================================================================
-- Streaks -- clean schema
-- Run this in the Supabase SQL Editor to reset everything from scratch.
-- WARNING: drops all existing data.
-- =============================================================================

create extension if not exists "uuid-ossp";

-- Drop everything that might exist from older versions
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop table if exists public.task_completions cascade;
drop table if exists public.tasks cascade;
drop table if exists public.profiles cascade;

-- =============================================================================
-- tasks
-- =============================================================================
create table public.tasks (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 200),
  active_days integer[] not null default '{}',
  color       text not null default '#F07F13'
              check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index tasks_user_id_idx on public.tasks(user_id);

-- =============================================================================
-- task_completions
-- =============================================================================
create table public.task_completions (
  id             uuid primary key default uuid_generate_v4(),
  task_id        uuid not null references public.tasks(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  completed_date date not null,
  created_at     timestamptz not null default now(),
  constraint task_completions_unique unique (task_id, completed_date)
);

create index task_completions_task_id_idx on public.task_completions(task_id);
create index task_completions_user_date_idx on public.task_completions(user_id, completed_date desc);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;

create policy "Users can view own tasks"
  on public.tasks for select using (auth.uid() = user_id);
create policy "Users can insert own tasks"
  on public.tasks for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks"
  on public.tasks for update using (auth.uid() = user_id);
create policy "Users can delete own tasks"
  on public.tasks for delete using (auth.uid() = user_id);

create policy "Users can view own completions"
  on public.task_completions for select using (auth.uid() = user_id);
create policy "Users can insert own completions"
  on public.task_completions for insert with check (auth.uid() = user_id);
create policy "Users can delete own completions"
  on public.task_completions for delete using (auth.uid() = user_id);

-- =============================================================================
-- v2 tables
-- Drop if they exist (safe re-run)
-- =============================================================================
drop table if exists public.notifications cascade;
drop table if exists public.group_members cascade;
drop table if exists public.groups cascade;
drop table if exists public.friendships cascade;
drop table if exists public.sub_records cascade;
drop table if exists public.activity_tag_links cascade;
drop table if exists public.goal_tag_links cascade;
drop table if exists public.tags cascade;
drop table if exists public.activities cascade;
drop table if exists public.goals cascade;

-- goals
create table public.goals (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 120),
  description  text check (char_length(description) <= 500),
  active_days  integer[] not null default '{}',
  priority     integer not null default 3 check (priority between 1 and 5),
  tag_ids      text[] not null default '{}',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index goals_user_id_idx on public.goals(user_id);
alter table public.goals enable row level security;
create policy "Users manage own goals" on public.goals using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- goal_completions
create table public.goal_completions (
  id             uuid primary key default uuid_generate_v4(),
  goal_id        uuid not null references public.goals(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  completed_date date not null,
  created_at     timestamptz not null default now(),
  constraint goal_completions_unique unique (goal_id, completed_date)
);
create index goal_completions_goal_id_idx on public.goal_completions(goal_id);
create index goal_completions_user_date_idx on public.goal_completions(user_id, completed_date desc);
alter table public.goal_completions enable row level security;
create policy "Users manage own goal completions" on public.goal_completions using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- activities
create table public.activities (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  assigner_user_id  uuid references auth.users(id) on delete set null,
  assignee_user_id  uuid references auth.users(id) on delete set null,
  group_id          uuid,
  title             text not null check (char_length(title) between 1 and 120),
  description       text check (char_length(description) <= 500),
  activity_date     date,
  activity_time     time,
  priority          integer not null default 3 check (priority between 1 and 5),
  tag_ids           text[] not null default '{}',
  status            text not null default 'accepted' check (status in ('pending','accepted','completed','rejected')),
  reminder_minutes  integer[] not null default '{}',
  snooze_minutes    integer not null default 15,
  loop_count        integer not null default 1,
  created_at        timestamptz not null default now()
);
create index activities_user_id_idx on public.activities(user_id);
alter table public.activities enable row level security;
create policy "Users manage own activities" on public.activities using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Assigners can view" on public.activities for select using (auth.uid() = assigner_user_id);

-- sub_records
create table public.sub_records (
  id          uuid primary key default uuid_generate_v4(),
  goal_id     uuid references public.goals(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  completed   boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.sub_records enable row level security;
create policy "Users manage own sub_records" on public.sub_records using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tags (global, managed by admin)
create table public.tags (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique check (char_length(name) between 1 and 40),
  color      text,
  created_at timestamptz not null default now()
);
alter table public.tags enable row level security;
create policy "All authenticated users can view tags" on public.tags for select using (auth.role() = 'authenticated');

-- friendships
create table public.friendships (
  id                      uuid primary key default uuid_generate_v4(),
  requester_id            uuid not null references auth.users(id) on delete cascade,
  addressee_id            uuid not null references auth.users(id) on delete cascade,
  status                  text not null default 'pending' check (status in ('pending','accepted','blocked')),
  auto_accept_activities  boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint friendships_unique unique (requester_id, addressee_id)
);
alter table public.friendships enable row level security;
create policy "Users view own friendships" on public.friendships for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "Users manage own friendships" on public.friendships using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- groups
create table public.groups (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 300),
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.groups enable row level security;
create policy "Owner manages group" on public.groups using (auth.uid() = created_by);

-- group_members (must exist before the groups membership-check policy)
create table public.group_members (
  id         uuid primary key default uuid_generate_v4(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner','admin','member')),
  status     text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  constraint group_members_unique unique (group_id, user_id)
);
alter table public.group_members enable row level security;
create policy "Users view own memberships" on public.group_members for select using (auth.uid() = user_id or
  exists (select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid()));
create policy "Users manage own memberships" on public.group_members using (auth.uid() = user_id);

-- groups membership-check policy (added after group_members exists)
create policy "Members view groups" on public.groups for select using (
  exists (select 1 from public.group_members where group_id = id and user_id = auth.uid())
);

-- notifications
create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  payload    jsonb not null default '{}',
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_id_idx on public.notifications(user_id, read, created_at desc);
alter table public.notifications enable row level security;
create policy "Users manage own notifications" on public.notifications using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- profiles (public cache of auth.users user_metadata — synced via trigger)
-- Allows joining without service role for display names.
-- =============================================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text,
  bio        text,
  avatar_url text,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles are public read" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_user_profile_upsert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, username, bio, updated_at)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'bio',
    now()
  )
  on conflict (id) do update set
    username   = excluded.username,
    bio        = excluded.bio,
    updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_profile_sync
  after insert or update on auth.users
  for each row execute procedure public.handle_user_profile_upsert();

notify pgrst, 'reload schema';
FILEEOF


# Patch globals.css - add flame-pulse keyframe if not present
if ! grep -q 'flame-pulse' app/globals.css; then
cat >> app/globals.css << 'CSSEOF'

/* Flame pulse animation for Spinner */
@keyframes flame-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.6; transform: scale(0.85); }
}
CSSEOF
echo "Patched globals.css"
fi

echo ""
echo "All files written."
echo "Done! Run: npm run build"