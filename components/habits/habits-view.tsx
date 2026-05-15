"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Loader2, Search, ChevronDown, ChevronRight, Flame, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SubTabBar } from "@/components/ui/subtab-bar";
import { TaskCard } from "@/components/tasks/task-card";
import { RCM, type RCMMode } from "@/components/records/rcm";
import { useTasks } from "@/lib/hooks/use-records";
import { useTags } from "@/lib/hooks/use-tags";
import { useProfileCache } from "@/lib/hooks/use-profile-cache";
import { trpc } from "@/lib/trpc";
import { createClient } from "@/lib/supabase/client";
import { type Task, type List } from "@/lib/types";

type PopulatedList = List & { tasks: Task[] };
type AllRecordsTab = "tasks" | "lists" | "global" | "archived";

const ALL_RECORDS_TABS: { id: AllRecordsTab; label: string }[] = [
  { id: "tasks",    label: "Tasks"    },
  { id: "lists",    label: "Lists"    },
  { id: "global",   label: "Global"   },
  { id: "archived", label: "Archived" },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function CollapsibleList({
  list,
  onTaskTap,
  onListEdit,
}: {
  list: PopulatedList;
  onTaskTap: (t: Task) => void;
  onListEdit: (l: List) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const count = list.tasks.length;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--color-bg-secondary)] transition-colors"
      >
        <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)] truncate">
          {list.title}{" "}
          <span className="font-normal text-[var(--color-text-secondary)]">
            ({count} task{count !== 1 ? "s" : ""})
          </span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onListEdit(list); }}
            className="text-[11px] text-[var(--color-text-disabled)] hover:text-[var(--color-text-secondary)] px-1"
          >
            Edit
          </button>
          {expanded
            ? <ChevronDown className="w-4 h-4 text-[var(--color-text-disabled)]" />
            : <ChevronRight className="w-4 h-4 text-[var(--color-text-disabled)]" />
          }
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          {count === 0 ? (
            <p className="px-3 py-3 text-xs text-[var(--color-text-disabled)] italic">No tasks in this list.</p>
          ) : (
            list.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                showDays={true}
                onClick={() => onTaskTap(task)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface HabitsViewProps {
  headerRight?: React.ReactNode;
  refreshTrigger?: number;
}

export function HabitsView({ headerRight, refreshTrigger = 0 }: HabitsViewProps) {
  const { tasks, lists, loading, error, refresh } = useTasks();
  const { tags } = useTags();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<AllRecordsTab>("tasks");

  const [rcmOpen, setRcmOpen] = useState(false);
  const [rcmMode, setRcmMode] = useState<RCMMode>("edit");
  const [rcmKind, setRcmKind] = useState<"task" | "list">("task");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeList, setActiveList] = useState<List | null>(null);

  const disableTaskMutation = trpc.tasks.disable.useMutation();
  const [completionsByTask, setCompletionsByTask] = useState<Record<string, Set<string>>>({});

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (refreshTrigger > 0) refresh();
  }, [refreshTrigger, refresh]);

  useEffect(() => {
    if (tasks.length === 0) return;
    const supabase = createClient();
    const cutoff = daysAgo(29);
    const taskIds = tasks.filter((t) => t.is_recurring).map((t) => t.id);
    if (!taskIds.length) return;
    supabase
      .from("task_completions")
      .select("task_id, completed_date")
      .in("task_id", taskIds)
      .gte("completed_date", cutoff)
      .then(({ data }) => {
        const map: Record<string, Set<string>> = {};
        for (const c of data ?? []) {
          if (!map[c.task_id]) map[c.task_id] = new Set();
          map[c.task_id].add(c.completed_date);
        }
        setCompletionsByTask(map);
      });
  }, [tasks]);

  const openTaskEdit = (t: Task) => {
    setActiveTask(t); setActiveList(null);
    setRcmMode("edit"); setRcmKind("task"); setRcmOpen(true);
  };
  const openListEdit = (l: List) => {
    setActiveList(l); setActiveTask(null);
    setRcmMode("edit"); setRcmKind("list"); setRcmOpen(true);
  };

  const handleReEnable = async (id: string) => {
    try { await disableTaskMutation.mutateAsync({ id, disabled: false }); refresh(); }
    catch { /* ignored */ }
  };

  const allAssignerIds = useMemo(
    () => tasks.map((t) => t.assigner_user_id).filter((id): id is string => !!id),
    [tasks]
  );
  useProfileCache(allAssignerIds);

  void completionsByTask;
  void tags;

  const q = search.toLowerCase();
  const taskTabItems   = tasks.filter(t => !t.is_global && !t.is_disabled && t.title.toLowerCase().includes(q));
  const globalTabItems = tasks.filter(t =>  t.is_global && !t.is_disabled && t.title.toLowerCase().includes(q));
  const archivedItems  = tasks.filter(t =>  t.is_disabled &&                  t.title.toLowerCase().includes(q));
  const filteredLists  = (lists as PopulatedList[]).filter(l =>
    l.title.toLowerCase().includes(q) || l.tasks?.some(t => t.title.toLowerCase().includes(q))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-secondary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-sm text-[var(--color-text-secondary)]">Something went wrong</p>
        <button onClick={refresh} className="text-sm text-[var(--color-brand)] underline">Retry</button>
      </div>
    );
  }

  const renderEmpty = (label: string) => (
    <div className="text-center py-16 space-y-3">
      <Flame className="w-10 h-10 mx-auto text-[var(--color-brand)]" />
      <p className="text-base font-semibold text-[var(--color-text-primary)]">
        {search ? "No results" : label}
      </p>
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        <PageHeader title="All Records" accentColor="var(--tab-goals)" right={headerRight} />

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

        <SubTabBar
          tabs={ALL_RECORDS_TABS}
          active={activeTab}
          onChange={setActiveTab}
          accentColor="var(--tab-goals)"
        />

        {activeTab === "tasks" && (
          taskTabItems.length === 0 ? renderEmpty("No tasks yet") : (
            <div className="space-y-2">
              {taskTabItems.map((task) => (
                <TaskCard key={task.id} task={task} showDays={true} onClick={() => openTaskEdit(task)} />
              ))}
            </div>
          )
        )}

        {activeTab === "lists" && (
          filteredLists.length === 0 ? renderEmpty("No lists yet") : (
            <div className="space-y-3">
              {filteredLists.map((list) => (
                <CollapsibleList key={list.id} list={list} onTaskTap={openTaskEdit} onListEdit={openListEdit} />
              ))}
            </div>
          )
        )}

        {activeTab === "global" && (
          globalTabItems.length === 0 ? renderEmpty("No global tasks yet") : (
            <div className="space-y-2">
              {globalTabItems.map((task) => (
                <TaskCard key={task.id} task={task} showDays={true} onClick={() => openTaskEdit(task)} />
              ))}
            </div>
          )
        )}

        {activeTab === "archived" && (
          archivedItems.length === 0 ? renderEmpty("No archived records") : (
            <div className="space-y-2">
              {archivedItems.map((task) => (
                <div key={task.id} className="relative" style={{ opacity: 0.6 }}>
                  <TaskCard task={task} completedToday={false} showDays={true} />
                  <button
                    onClick={() => handleReEnable(task.id)}
                    className="absolute top-2 right-2 flex items-center gap-1 text-xs text-[var(--color-brand)] bg-[var(--color-surface-raised)] rounded-lg px-2 py-1 border border-[var(--color-border)] z-10"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Re-enable
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {rcmOpen && (
        <RCM
          open
          mode={rcmMode}
          initialKind={rcmKind}
          task={activeTask ?? undefined}
          list={activeList ?? undefined}
          userLists={lists}
          onClose={() => { setRcmOpen(false); setActiveTask(null); setActiveList(null); }}
          onSave={() => { setRcmOpen(false); setActiveTask(null); setActiveList(null); refresh(); }}
        />
      )}
    </>
  );
}
