"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, CheckSquare, Square } from "lucide-react";
import type { SubRecord } from "@/lib/types";

interface Props { goalId?: string; activityId?: string; }

export function SubRecordsList({ goalId, activityId }: Props) {
  const [items, setItems] = useState<SubRecord[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const qs = goalId ? `goal_id=${goalId}` : `activity_id=${activityId}`;
    const r = await fetch(`/api/sub-records?${qs}`);
    if (r.ok) { const d = await r.json(); setItems(d.sub_records ?? []); }
  }, [goalId, activityId]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (item: SubRecord) => {
    await fetch(`/api/sub-records/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !item.completed }),
    });
    load();
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    await fetch("/api/sub-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), goal_id: goalId, activity_id: activityId }),
    });
    setNewTitle(""); load(); setAdding(false);
  };

  const done = items.filter((i) => i.completed).length;

  return (
    <div>
      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Sub-tasks</span>
            <span className="text-xs text-[var(--color-text-secondary)]">{done}/{items.length}</span>
          </div>
          <div className="w-full h-1 bg-[var(--color-bg-secondary)] rounded-full mb-2 overflow-hidden">
            <div className="h-full bg-[var(--color-success)] rounded-full transition-all"
              style={{ width: items.length ? `${(done/items.length)*100}%` : "0%" }} />
          </div>
          <div className="space-y-1">
            {items.map((item) => (
              <button key={item.id} onClick={() => toggle(item)} className="flex items-center gap-2 w-full text-left">
                {item.completed
                  ? <CheckSquare className="w-3.5 h-3.5 text-[var(--color-success)] shrink-0" />
                  : <Square className="w-3.5 h-3.5 text-[var(--color-text-disabled)] shrink-0" />}
                <span className={`text-xs ${item.completed ? "line-through text-[var(--color-text-disabled)]" : "text-[var(--color-text-primary)]"}`}>
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      <form onSubmit={add} className="flex items-center gap-2 mt-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add sub-task..."
          className="flex-1 text-xs px-2 py-1.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
        />
        <button type="submit" disabled={adding || !newTitle.trim()} className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-white disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
