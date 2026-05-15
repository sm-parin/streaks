"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Flame, TrendingUp, TrendingDown, Minus, Search, CheckCircle2, LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Spinner } from "@/components/ui/spinner";
import { SubTabBar } from "@/components/ui/subtab-bar";
import { StreakCard } from "@/components/streaks/streak-card";
import { MilestoneFilterBar, type FilterState } from "@/components/streaks/milestone-filter-bar";
import { LineGraph } from "@/components/streaks/line-graph";
import { createClient } from "@/lib/supabase/client";
import { useStreaks } from "@/lib/hooks/use-streaks";
import type { StreakResult, Priority, Task } from "@/lib/types";
import { PRIORITY_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type MainTab = "tasks" | "lists";
type View = "primary" | "secondary";
interface PersonalAnalytics { momentumScore: number; trend: "up"|"down"|"flat"; heatmapData: { date: string; count: number }[]; bestDayOfWeek: { day: number; label: string; rate: number }[]; }

const MAIN_TABS: { id: MainTab; label: string }[] = [
  { id: "tasks", label: "Tasks" },
  { id: "lists", label: "Lists" },
];
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function heatColor(count: number): string {
  if (count === 0) return "var(--color-surface-raised)";
  if (count === 1) return "rgba(240,127,19,0.20)";
  if (count === 2) return "rgba(240,127,19,0.60)";
  return "rgba(240,127,19,1)";
}

function Heatmap({ data }: { data: { date: string; count: number }[] }) {
  if (!data.length) return null;
  const firstDate = new Date(data[0].date + "T00:00:00");
  const startDOW = firstDate.getDay();
  const padded: Array<{ date: string; count: number } | null> = [...Array(startDOW).fill(null), ...data];
  while (padded.length % 7 !== 0) padded.push(null);
  const weeks: Array<Array<{ date: string; count: number } | null>> = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
  const monthLabels: Record<number, string> = {};
  weeks.forEach((week, wi) => {
    const first = week.find((c) => c !== null);
    if (first) {
      const d = new Date(first.date + "T00:00:00");
      if (d.getDate() <= 7) monthLabels[wi] = MONTH_LABELS[d.getMonth()];
    }
  });
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 uppercase tracking-wide">Your year at a glance</p>
      <div className="flex gap-0.5">
        <div className="flex flex-col gap-0.5 mr-1 mt-[18px]">
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <div key={i} className={cn("h-[10px] text-[9px] leading-[10px] text-[var(--color-text-disabled)]", [1,3,5].includes(i) ? "opacity-100" : "opacity-0")}>{d}</div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-0.5 mb-0.5 h-[14px]">
            {weeks.map((_, wi) => (<div key={wi} className="w-[10px] text-[9px] text-[var(--color-text-disabled)] truncate shrink-0">{monthLabels[wi] ?? ""}</div>))}
          </div>
          <div className="flex gap-0.5">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((cell, di) => (
                  <div key={di} className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: cell ? heatColor(cell.count) : "var(--color-surface-raised)" }} title={cell ? `${cell.date}: ${cell.count}` : undefined} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BestDayChart({ data }: { data: { label: string; rate: number }[] }) {
  const maxRate = Math.max(...data.map((d) => d.rate), 0.001);
  const bestIdx = data.reduce((bi, d, i) => (d.rate > data[bi].rate ? i : bi), 0);
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 uppercase tracking-wide">Your best day</p>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--color-text-secondary)] w-7 shrink-0">{d.label}</span>
            <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(d.rate / maxRate) * 100}%`, backgroundColor: i === bestIdx ? "var(--color-brand)" : "var(--color-border)" }} />
            </div>
            <span className="text-[11px] text-[var(--color-text-secondary)] w-7 text-right shrink-0">{Math.round(d.rate * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DailyData { tasks: Task[]; completedTaskIds: string[]; }
interface GraphData  { points: { label: string; value: number }[]; label: string; }

function MilestonesView({ data, mode }: { data: unknown; mode: string }) {
  if (!data) return null;
  const isDailyMode = mode === "Today" || mode === "Daily";
  if (isDailyMode) {
    const d = data as DailyData;
    if (!d.tasks?.length) return <p className="text-center text-sm text-[var(--color-text-secondary)] py-8">No tasks scheduled for this day.</p>;
    return (
      <div className="space-y-2">
        {d.tasks.map((task) => {
          const done = d.completedTaskIds.includes(task.id);
          const priorityColor = PRIORITY_COLORS[task.priority] ?? "#F07F13";
          return (
            <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "var(--radius-lg)", borderLeft: `4px solid ${priorityColor}`, backgroundColor: "var(--color-surface-raised)", opacity: done ? 0.6 : 1 }}>
              <CheckCircle2 style={{ width: "18px", height: "18px", flexShrink: 0, color: done ? "#22C55E" : "var(--color-border)" }} />
              <span style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: "var(--color-text-primary)", textDecoration: done ? "line-through" : "none" }}>{task.title}</span>
            </div>
          );
        })}
      </div>
    );
  }
  const g = data as GraphData;
  const points = (g.points ?? []).map((p) => ({ label: p.label, value: p.value }));
  return (
    <div className="space-y-2">
      {g.label && <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">{g.label}</p>}
      <LineGraph points={points} />
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { streaks, isLoading: streaksLoading, error: streaksError, refresh } = useStreaks();
  const [taskMeta, setTaskMeta] = useState<Record<string, { title: string; priority: Priority; allow_grace: boolean; list_id: string | null }>>({});
  const [view, setView] = useState<View>("primary");
  const [mainTab, setMainTab] = useState<MainTab>("tasks");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"current" | "best" | "broken">("current");
  const [personal, setPersonal] = useState<PersonalAnalytics | null>(null);
  const [personalLoading, setPersonalLoading] = useState(false);

  const todayDate = new Date();
  const [filterState, setFilterState] = useState<FilterState>({
    mode: "Today",
    day: todayDate.getDate(),
    month: todayDate.getMonth() + 1,
    year: todayDate.getFullYear(),
  });
  const [milestonesData, setMilestonesData] = useState<unknown>(null);
  const [milestonesLoading, setMilestonesLoading] = useState(false);

  const fetchTaskMeta = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("tasks").select("id, title, priority, allow_grace, list_id").eq("is_recurring", true).not("status", "eq", "rejected");
    if (data) {
      const map: Record<string, { title: string; priority: Priority; allow_grace: boolean; list_id: string | null }> = {};
      for (const t of data as Array<{ id: string; title: string; priority: number; allow_grace: boolean; list_id: string | null }>) {
        map[t.id] = { title: t.title, priority: t.priority as Priority, allow_grace: t.allow_grace, list_id: t.list_id ?? null };
      }
      setTaskMeta(map);
    }
  }, []);

  const fetchMilestones = useCallback(async (fs: FilterState) => {
    setMilestonesLoading(true);
    try {
      const params = new URLSearchParams({ mode: fs.mode, day: String(fs.day), month: String(fs.month), year: String(fs.year) });
      const r = await fetch(`/api/analytics/milestones?${params}`);
      if (r.ok) setMilestonesData(await r.json());
    } finally { setMilestonesLoading(false); }
  }, []);

  const fetchPersonal = useCallback(async () => {
    setPersonalLoading(true);
    try { const r = await fetch("/api/analytics/personal"); if (r.ok) setPersonal(await r.json()); }
    finally { setPersonalLoading(false); }
  }, []);

  useEffect(() => { fetchTaskMeta(); refresh(); fetchPersonal(); }, [fetchTaskMeta, refresh, fetchPersonal]);
  useEffect(() => { if (view === "secondary") fetchMilestones(filterState); }, [view, filterState, fetchMilestones]);

  const filteredAndSorted = useMemo(() => {
    const q = search.toLowerCase();
    let list = streaks.map((r: StreakResult) => ({
      result: r,
      meta: taskMeta[r.task_id] ?? { title: "...", priority: 3 as Priority, allow_grace: false, list_id: null },
    }));
    if (q) list = list.filter((p) => p.meta.title.toLowerCase().includes(q));
    if (mainTab === "tasks") list = list.filter(p => !p.meta.list_id);
    if (mainTab === "lists") list = list.filter(p => !!p.meta.list_id);
    list = [...list].sort((a, b) => {
      if (sortBy === "current") return b.result.currentStreak - a.result.currentStreak;
      if (sortBy === "best")    return b.result.longestStreak  - a.result.longestStreak;
      return a.result.timesStreakBroken - b.result.timesStreakBroken;
    });
    return list;
  }, [streaks, taskMeta, search, sortBy, mainTab]);

  const toggleButton = (
    <button
      onClick={() => setView((v) => v === "primary" ? "secondary" : "primary")}
      className="p-1.5 rounded-lg transition-colors"
      style={{ color: view === "secondary" ? "var(--tab-analytics)" : "var(--color-text-secondary)" }}
      aria-label={view === "primary" ? "View Milestones" : "View Streaks"}
    >
      <LayoutGrid className="w-5 h-5" />
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <PageHeader title="Streaks" accentColor="var(--tab-analytics)" className="mb-4" right={toggleButton} />

      {view === "secondary" && (
        <div className="space-y-4">
          <MilestoneFilterBar value={filterState} onChange={(fs) => setFilterState(fs)} />
          {milestonesLoading ? <div className="flex justify-center py-8"><Spinner /></div> : <MilestonesView data={milestonesData} mode={filterState.mode} />}
        </div>
      )}

      {view === "primary" && (
        <>
          <SubTabBar tabs={MAIN_TABS} active={mainTab} onChange={setMainTab} accentColor="var(--tab-analytics)" className="mb-5" />

          {(mainTab === "tasks" || mainTab === "lists") && (
            <div className="space-y-6">
              {mainTab === "tasks" && personalLoading ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : mainTab === "tasks" && personal ? (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-5 py-4">
                  <div className="flex items-end gap-3">
                    <span className="text-5xl font-bold tabular-nums text-[var(--color-text-primary)]">{personal.momentumScore}</span>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      {personal.trend === "up"   && (<><TrendingUp   className="w-4 h-4 text-green-500" /><span className="text-sm font-medium text-green-500">Rising</span></>)}
                      {personal.trend === "flat" && (<><Minus         className="w-4 h-4 text-amber-500" /><span className="text-sm font-medium text-amber-500">Steady</span></>)}
                      {personal.trend === "down" && (<><TrendingDown  className="w-4 h-4 text-red-500"   /><span className="text-sm font-medium text-red-500">Falling</span></>)}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-text-disabled)] mt-1">Based on your last 7 days vs your 30-day average.</p>
                </div>
              ) : null}

              {streaksLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 animate-pulse" style={{ minHeight: "128px" }}>
                      <div className="h-5 rounded bg-[var(--color-border)] w-2/3 mb-3" />
                      <div className="flex gap-2 mb-3">{[1, 2, 3].map((j) => <div key={j} className="flex-1 h-14 rounded bg-[var(--color-border)]" />)}</div>
                      <div className="h-2.5 rounded bg-[var(--color-border)] w-full mb-2" />
                      <div className="h-2.5 rounded bg-[var(--color-border)] w-1/3" />
                    </div>
                  ))}
                </div>
              ) : streaksError ? (
                <p className="text-center text-sm text-red-500">{streaksError}</p>
              ) : streaks.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <Flame className="w-10 h-10 text-[var(--tab-analytics)] mx-auto" />
                  <p className="text-base font-semibold text-[var(--color-text-primary)]">No streak data yet</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Create recurring habits to track your streaks</p>
                  <button onClick={() => router.push("/goals")} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--tab-analytics)] text-white text-sm font-medium">Add a habit</button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-disabled)]" />
                      <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search habits..." className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus:outline-none focus:border-[var(--color-brand)]" />
                    </div>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "current" | "best" | "broken")} className="shrink-0 text-xs border border-[var(--color-border)] rounded-xl px-3 py-2 bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)] cursor-pointer">
                      <option value="current">Sort: Current Streak</option>
                      <option value="best">Sort: Best Streak</option>
                      <option value="broken">Sort: Times Broken</option>
                    </select>
                  </div>

                  {filteredAndSorted.length === 0 ? (
                    <p className="text-center text-sm text-[var(--color-text-secondary)] py-8">{search ? "No habits match your search." : `No ${mainTab === "tasks" ? "task" : "list"} streaks yet.`}</p>
                  ) : (
                    <div className="space-y-3">
                      {filteredAndSorted.map(({ result, meta }) => (
                        <StreakCard key={result.task_id} streak={result} title={meta.title} priority={meta.priority} allowGrace={meta.allow_grace} />
                      ))}
                    </div>
                  )}

                  {mainTab === "tasks" && personal && personal.heatmapData.length > 0 && <Heatmap data={personal.heatmapData} />}
                  {mainTab === "tasks" && personal && <BestDayChart data={personal.bestDayOfWeek} />}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
