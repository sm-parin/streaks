"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTags } from "@/lib/hooks/use-tags";
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
  const [selectedTags, setSelectedTags] = useState<string[]>(goal?.tag_ids ?? []);
  const [loading, setLoading] = useState(false);
  const { tags } = useTags();
  const { showToast } = useToast();

  const toggleDay = (d: number) =>
    setActiveDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  const toggleTag = (id: string) =>
    setSelectedTags((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return showToast("Title is required", "error");
    if (!activeDays.length) return showToast("Select at least one day", "error");
    setLoading(true);
    const body = { title: title.trim(), description: desc || undefined, active_days: activeDays, priority, tag_ids: selectedTags };
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
