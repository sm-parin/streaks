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

export function ActivitiesList({ onAddNew, search = "", sortDir = "asc" }: {
  onAddNew: () => void;
  search?: string;
  sortDir?: SortDir;
}) {
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ActivityType | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/activities");
    if (r.ok) { const d = await r.json(); setActivities(d.activities ?? []); }
    setLoading(false);
  }, []);

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
