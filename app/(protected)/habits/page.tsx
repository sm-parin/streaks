"use client";
import { useState, useEffect, useMemo } from "react";
import { Plus, Loader2, Trash2, Search, ChevronDown, ChevronRight, Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/tasks/task-card";
import { ListCard } from "@/components/records/list-card";
import { SwipeableWrapper } from "@/components/records/swipeable-wrapper";
import { RCM, type RCMMode } from "@/components/records/rcm";
import { useTasks } from "@/lib/hooks/use-records";
import { useTags } from "@/lib/hooks/use-tags";
import { useProfileCache } from "@/lib/hooks/use-profile-cache";
import { createClient } from "@/lib/supabase/client";
import { type Task, type List } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type PopulatedList = List & { tasks: Task[] };

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

/** Compute 0â€“1 completion rate for a recurring task over last 30 days */
function computeRate(
  task: Task,
  completionsByTask: Record<string, Set<string>>
): number {
  if (!task.is_recurring || !task.active_days?.length) return 0;
  const cutoff = daysAgo(29); // 30 days inclusive
  let scheduled = 0, done = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    if (ds < cutoff) break;
    if (task.active_days.includes(d.getDay() as 0|1|2|3|4|5|6)) {
      scheduled++;
      if (completionsByTask[task.id]?.has(ds)) done++;
    }
  }
  return scheduled > 0 ? done / scheduled : 0;
}

// â”€â”€ Collapsible list row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CollapsibleList({
  list,
  tags,
  completionsByTask,
  onTaskInfo,
  onTaskEdit,
  onListInfo,
  onListEdit,
  onDelete,
}: {
  list: PopulatedList;
  tags: { id: string; name: string; color: string }[];
  completionsByTask: Record<string, Set<string>>;
  onTaskInfo: (t: Task) => void;
  onTaskEdit: (t: Task) => void;
  onListInfo: (l: List) => void;
  onListEdit: (l: List) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const count = list.tasks.length;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] overflow-hidden">
      {/* Header row */}
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

      {/* Tasks (expanded) */}
      {expanded && (
        <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          {count === 0 ? (
            <p className="px-3 py-3 text-xs text-[var(--color-text-disabled)] italic">No tasks in this list.</p>
          ) : (
            list.tasks.map((task) => (
              <SwipeableWrapper
                key={task.id}
                onSwipeLeft={() => onDelete(task.id)}
                leftLabel="Delete"
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                <TaskCard
                  task={task}
                  showDays={true}
                  onClick={() => onTaskInfo(task)}
                  onDoubleClick={() => onTaskEdit(task)}
                />
              </SwipeableWrapper>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// â”€â”€ Main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function HabitsPage() {
  const router = useRouter();
  const { tasks, lists, loading, error, refresh, deleteTask } = useTasks();
  const { tags } = useTags();
  const [search, setSearch] = useState("");

  const [rcmOpen, setRcmOpen] = useState(false);
  const [rcmMode, setRcmMode] = useState<RCMMode>("create");
  const [rcmKind, setRcmKind] = useState<"task" | "list">("task");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeList, setActiveList] = useState<List | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // 30-day completions for health dots
  const [completionsByTask, setCompletionsByTask] = useState<Record<string, Set<string>>>({});

  useEffect(() => { refresh(); }, [refresh]);

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

  const openTaskInfo = (t: Task) => { setActiveTask(t); setActiveList(null); setRcmMode("info"); setRcmKind("task"); setRcmOpen(true); };
  const openTaskEdit = (t: Task) => { setActiveTask(t); setActiveList(null); setRcmMode("edit"); setRcmKind("task"); setRcmOpen(true); };
  const openListInfo = (l: List) => { setActiveList(l); setActiveTask(null); setRcmMode("info"); setRcmKind("list"); setRcmOpen(true); };
  const openListEdit = (l: List) => { setActiveList(l); setActiveTask(null); setRcmMode("edit"); setRcmKind("list"); setRcmOpen(true); };
  const openCreate   = () => { setActiveTask(null); setActiveList(null); setRcmMode("create"); setRcmKind("task"); setRcmOpen(true); };

  const handleDelete = async (id: string) => {
    try { await deleteTask(id); setConfirmDelete(null); refresh(); } catch { /* ignored */ }
  };

  // Batch-prefetch assigner profiles
  const allAssignerIds = useMemo(
    () => tasks.map((t) => t.assigner_user_id).filter((id): id is string => !!id),
    [tasks]
  );
  useProfileCache(allAssignerIds);

  // Filtered
  const q = search.toLowerCase();
  const filteredLists = (lists as PopulatedList[]).filter((l) =>
    l.title.toLowerCase().includes(q) || l.tasks?.some((t) => t.title.toLowerCase().includes(q))
  );
  const filteredTasks = tasks.filter(
    (t) => t.title.toLowerCase().includes(q)
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

  const isEmpty = filteredTasks.length === 0 && filteredLists.length === 0;

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <PageHeader title="Habits" />
          <Button
            size="sm"
            onClick={openCreate}
            style={{ backgroundColor: "var(--tab-habits)", borderColor: "var(--tab-habits)" }}
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
            placeholder="Search habits..."
            className="w-full px-3 py-2 pl-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus:outline-none focus:border-[var(--color-brand)]"
          />
        </div>

        {isEmpty ? (
          <div className="text-center py-16 space-y-3">
            <Flame className="w-10 h-10 mx-auto text-[var(--color-brand)]" />
            <p className="text-base font-semibold text-[var(--color-text-primary)]">
              {search ? "No results" : "No habits yet"}
            </p>
            {!search && (
              <>
                <p className="text-sm text-[var(--color-text-secondary)]">Start building your first habit</p>
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-brand)] text-white text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> Create habit
                </button>
              </>
            )}
          </div>
        ) : (
          <>
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
                    <TaskCard
                      task={task}
                      showDays={true}
                      onClick={() => openTaskInfo(task)}
                      onDoubleClick={() => openTaskEdit(task)}
                    />
                  </SwipeableWrapper>
                ))}
              </div>
            )}

            {filteredLists.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] px-1">
                  Lists
                </p>
                {filteredLists.map((list) => (
                  <CollapsibleList
                    key={list.id}
                    list={list}
                    tags={tags}
                    completionsByTask={completionsByTask}
                    onTaskInfo={openTaskInfo}
                    onTaskEdit={openTaskEdit}
                    onListInfo={openListInfo}
                    onListEdit={openListEdit}
                    onDelete={(id) => setConfirmDelete(id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative z-10 w-full max-w-xs bg-[var(--color-surface-raised)] rounded-2xl p-6 shadow-xl text-center space-y-4">
            <p className="text-sm text-[var(--color-text-primary)] font-medium">Delete this habit?</p>
            <p className="text-xs text-[var(--color-text-secondary)]">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2 rounded-xl bg-[var(--color-error)] text-white text-sm font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <RCM
        open={rcmOpen}
        onClose={() => setRcmOpen(false)}
        mode={rcmMode}
        initialKind={rcmKind}
        task={activeTask ?? undefined}
        list={activeList ?? undefined}
        userLists={lists}
        onSave={() => { setRcmOpen(false); refresh(); }}
      />
    </>
  );
}
