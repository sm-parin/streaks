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
