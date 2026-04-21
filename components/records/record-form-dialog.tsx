"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTags } from "@/lib/hooks/use-tags";
import { useToast } from "@/components/ui/toast";
import { PRIORITY_LABELS } from "@/lib/types";
import type { Activity } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";

interface Props {
  type: "goal" | "activity";
  activity?: Partial<Activity>;
  prefill?: { assignee_user_id?: string; group_id?: string; assignee_label?: string };
  onClose: () => void;
  onSaved: () => void;
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
  const [reminders, setReminders] = useState<string>("15,60");
  const [loading, setLoading] = useState(false);
  const { tags } = useTags();
  const { showToast } = useToast();

  const toggleTag = (id: string) =>
    setSelectedTags((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const parseReminders = () =>
    reminders.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return showToast("Title is required", "error");
    setLoading(true);
    const body = {
      title: title.trim(),
      description: desc || undefined,
      activity_date: date || null,
      activity_time: time || null,
      priority,
      tag_ids: selectedTags,
      reminder_minutes: parseReminders(),
      ...(prefill?.assignee_user_id ? { assignee_user_id: prefill.assignee_user_id } : {}),
      ...(prefill?.group_id ? { group_id: prefill.group_id } : {}),
    };
    const r = await fetch(isEdit ? `/api/activities/${activity!.id}` : "/api/activities", {
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
          <h2 className="font-semibold text-[var(--color-text-primary)]">
            {isEdit ? "Edit Activity" : prefill?.assignee_label ? `Assign to ${prefill.assignee_label}` : "New Activity"}
          </h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)]"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {prefill?.assignee_label && (
            <div className="px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] text-xs text-[var(--color-text-secondary)]">
              Assigning to: <span className="font-semibold text-[var(--color-text-primary)]">{prefill.assignee_label}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="a-title">Title *</Label>
            <Input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Team meeting" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="a-desc">Description</Label>
            <textarea id="a-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={500}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="a-date">Date</Label>
              <Input id="a-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-time">Time</Label>
              <Input id="a-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="a-reminders">Reminders (minutes before, comma-separated)</Label>
            <Input id="a-reminders" value={reminders} onChange={(e) => setReminders(e.target.value)} placeholder="15, 60" />
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map((p) => (
                <button key={p} type="button" onClick={() => setPriority(p as 1|2|3|4|5)}
                  className={cn(
                    "flex-1 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold border transition-colors",
                    priority === p ? "border-[var(--color-brand)] bg-[var(--color-brand-light)] text-[var(--color-brand)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                  )}>
                  P{p}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">{PRIORITY_LABELS[priority]}</p>
          </div>

          {tags.length > 0 && (
            <div className="space-y-1.5">
              <Label>Tags</Label>
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
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1">{isEdit ? "Save" : "Create"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
