"use client";
import { useState, useEffect } from "react";
import { Plus, Loader2, Trash2, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { RecordCard } from "@/components/records/record-card";
import { ListCard } from "@/components/records/list-card";
import { SwipeableWrapper } from "@/components/records/swipeable-wrapper";
import { RCM, type RCMMode } from "@/components/records/rcm";
import { useRecords } from "@/lib/hooks/use-records";
import { useTags } from "@/lib/hooks/use-tags";
import { type AppRecord, type Task, type List, isList, isTask } from "@/lib/types";

export default function RecordsPage() {
  const { records, loading, error, refresh, deleteRecord } = useRecords();
  const { tags } = useTags();
  const [search, setSearch] = useState("");

  const [rcmOpen, setRcmOpen] = useState(false);
  const [rcmMode, setRcmMode] = useState<RCMMode>("create");
  const [rcmKind, setRcmKind] = useState<"task" | "list">("task");
  const [activeRecord, setActiveRecord] = useState<AppRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const lists = records.filter(isList) as (List & { tasks: Task[] })[];
  const tasks = records.filter(isTask) as Task[];

  useEffect(() => { refresh(); }, [refresh]);

  const filteredLists = lists.filter((l) =>
    l.title.toLowerCase().includes(search.toLowerCase())
  );
  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const openInfo = (r: AppRecord) => {
    setActiveRecord(r); setRcmMode("info"); setRcmKind(r.kind); setRcmOpen(true);
  };
  const openEdit = (r: AppRecord) => {
    setActiveRecord(r); setRcmMode("edit"); setRcmKind(r.kind); setRcmOpen(true);
  };
  const openCreate = () => {
    setActiveRecord(null); setRcmMode("create"); setRcmKind("task"); setRcmOpen(true);
  };

  const handleDelete = async (id: string) => {
    try { await deleteRecord(id); setConfirmDelete(null); refresh(); } catch {/* ignore */}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-secondary)]" />
      </div>
    );
  }

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <PageHeader title="Records" />
          <Button
            size="sm"
            onClick={openCreate}
            style={{ backgroundColor: "var(--tab-records)", borderColor: "var(--tab-records)" }}
            className="text-white flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-disabled)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search records..."
            className="w-full px-3 py-2 pl-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus:outline-none focus:border-[var(--color-brand)]"
          />
        </div>

        {error && (
          <p className="text-sm text-[var(--color-error)] text-center py-4">{error}</p>
        )}

        {filteredLists.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] px-1">
              Lists
            </p>
            {filteredLists.map((list) => (
              <SwipeableWrapper
                key={list.id}
                onSwipeLeft={() => setConfirmDelete(list.id)}
                leftLabel="Delete"
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                <ListCard
                  list={list}
                  tags={tags}
                  onListClick={() => openInfo(list)}
                  onListDoubleClick={() => openEdit(list)}
                  onTaskClick={(t) => openInfo(t)}
                  onTaskDoubleClick={(t) => openEdit(t)}
                />
              </SwipeableWrapper>
            ))}
          </div>
        )}

        {filteredTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] px-1">
              Tasks
            </p>
            {filteredTasks.map((task) => (
              <SwipeableWrapper
                key={task.id}
                onSwipeLeft={() => setConfirmDelete(task.id)}
                leftLabel="Delete"
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                <RecordCard
                  task={task}
                  tags={tags}
                  onClick={() => openInfo(task)}
                  onDoubleClick={() => openEdit(task)}
                />
              </SwipeableWrapper>
            ))}
          </div>
        )}

        {filteredLists.length === 0 && filteredTasks.length === 0 && !loading && (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4">
              {search ? "No results" : "No records yet"}
            </p>
            {!search && (
              <button onClick={openCreate} className="text-sm text-[var(--color-brand)] underline">
                Create your first task
              </button>
            )}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
          <div className="relative z-10 bg-[var(--color-surface-raised)] rounded-lg p-5 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">Delete record?</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-md border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2 rounded-md bg-[var(--priority-1)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <RCM
        open={rcmOpen}
        onClose={() => { setRcmOpen(false); setActiveRecord(null); }}
        mode={rcmMode}
        initialKind={rcmKind}
        task={isTask(activeRecord ?? {} as AppRecord) ? (activeRecord as Task) : undefined}
        list={isList(activeRecord ?? {} as AppRecord) ? (activeRecord as List & { tasks: Task[] }) : undefined}
        userLists={lists}
        onSave={() => { setRcmOpen(false); refresh(); }}
      />
    </>
  );
}
