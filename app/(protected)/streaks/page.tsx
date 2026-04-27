"use client";

import { useState, useEffect, useCallback } from "react";
import { Flame, TrendingUp, TrendingDown, Minus, Check } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Spinner } from "@/components/ui/spinner";
import { SubTabBar } from "@/components/ui/subtab-bar";
import { StreakCard } from "@/components/streaks/streak-card";
import { createClient } from "@/lib/supabase/client";
import { useStreaks } from "@/lib/hooks/use-streaks";
import type { Group, StreakResult } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type MainTab = "personal" | "group";
interface PersonalAnalytics { momentumScore: number; trend: "up"|"down"|"flat"; heatmapData: { date: string; count: number }[]; bestDayOfWeek: { day: number; label: string; rate: number }[]; }
interface HabitCompletion { task_id: string; task_title: string; completedDates: string[]; }
interface MatrixMember { user_id: string; username: string; habitCompletions: HabitCompletion[]; }
interface Standing { rank: number; user_id: string; username: string; currentStreak: number; }
interface GroupAnalytics { memberMatrix: MatrixMember[]; standings: Standing[]; groupRecord: { username: string; longestStreak: number; task_title: string } | null; }
const MAIN_TABS: { id: MainTab; label: string }[] = [{ id: "personal", label: "Personal" }, { id: "group", label: "Group" }];
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function heatColor(count: number): string { if (count === 0) return "var(--color-surface-raised)"; if (count === 1) return "rgba(240,127,19,0.20)"; if (count === 2) return "rgba(240,127,19,0.60)"; return "rgba(240,127,19,1)"; }

function Heatmap({ data }: { data: { date: string; count: number }[] }) {
  if (!data.length) return null;
  const firstDate = new Date(data[0].date + "T00:00:00");
  const startDOW = firstDate.getDay();
  const padded: Array<{ date: string; count: number } | null> = [...Array(startDOW).fill(null), ...data];
  while (padded.length % 7 !== 0) padded.push(null);
  const weeks: Array<Array<{ date: string; count: number } | null>> = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
  const monthLabels: Record<number, string> = {};
  weeks.forEach((week, wi) => { const first = week.find((c) => c !== null); if (first) { const d = new Date(first.date + "T00:00:00"); if (d.getDate() <= 7) monthLabels[wi] = MONTH_LABELS[d.getMonth()]; } });
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
                {week.map((cell, di) => (<div key={di} className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: cell ? heatColor(cell.count) : "var(--color-surface-raised)" }} title={cell ? `${cell.date}: ${cell.count}` : undefined} />))}
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

function GroupMatrix({ matrix }: { matrix: MatrixMember[] }) {
  if (!matrix.length) return <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">No group habits yet.</p>;
  const habits = matrix[0]?.habitCompletions ?? [];
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 uppercase tracking-wide">This week</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left pr-2 pb-2 text-[var(--color-text-disabled)] font-normal w-20"></th>
              {habits.map((h) => (
                <th key={h.task_id} className="pb-2 px-1 text-[var(--color-text-secondary)] font-medium">
                  <span className="block" style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", maxHeight: 60, overflow: "hidden" }}>
                    {h.task_title.length > 12 ? h.task_title.slice(0, 12) + "…" : h.task_title}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((m) => (
              <tr key={m.user_id}>
                <td className="pr-2 py-1 text-[var(--color-text-primary)] font-medium truncate max-w-[80px]">@{m.username}</td>
                {m.habitCompletions.map((h) => {
                  const done = h.completedDates.length > 0;
                  return (
                    <td key={h.task_id} className="px-1 py-1 text-center">
                      <div className={cn("w-5 h-5 rounded-full mx-auto flex items-center justify-center", done ? "bg-green-500" : "bg-[var(--color-border)] opacity-40")}>
                        {done && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupStandings({ standings, currentUserId }: { standings: Standing[]; currentUserId: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 uppercase tracking-wide">Standings</p>
      <div className="space-y-1.5">
        {standings.map((s) => {
          const isMe = s.user_id === currentUserId;
          return (
            <div key={s.user_id} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--color-surface-raised)]", isMe && "border-l-2 border-[var(--color-brand)]")}>
              <span className="text-xs font-bold text-[var(--color-text-disabled)] w-4">{s.rank}</span>
              <span className="flex-1 text-sm text-[var(--color-text-primary)] font-medium truncate">@{s.username}</span>
              <div className="flex items-center gap-1 shrink-0">
                <Flame className="w-3.5 h-3.5 text-[#EF4444]" />
                <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">{s.currentStreak}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-[var(--color-text-disabled)] mt-1.5 pl-1">Resets Monday</p>
    </div>
  );
}

function GroupRecord({ record }: { record: { username: string; longestStreak: number; task_title: string } }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 flex items-center gap-3">
      <Flame className="w-6 h-6 text-[#EF4444] shrink-0" />
      <div>
        <p className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-0.5">All-time group record</p>
        <p className="text-sm text-[var(--color-text-primary)]">
          <span className="font-semibold">@{record.username}</span>{" · "}
          <span className="font-bold text-[#EF4444]">{record.longestStreak} days</span>{" · "}
          {record.task_title}
        </p>
      </div>
    </div>
  );
}

export default function StreaksPage() {
  const { streaks, isLoading: streaksLoading, error: streaksError, refresh } = useStreaks();
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [mainTab, setMainTab] = useState<MainTab>("personal");
  const [personal, setPersonal] = useState<PersonalAnalytics | null>(null);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupAnalytics, setGroupAnalytics] = useState<GroupAnalytics | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const fetchTitles = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("tasks").select("id, title").eq("is_recurring", true).not("status", "eq", "rejected");
    if (data) setTitles(Object.fromEntries(data.map((t: { id: string; title: string }) => [t.id, t.title])));
  }, []);

  const fetchPersonal = useCallback(async () => {
    setPersonalLoading(true);
    try { const r = await fetch("/api/analytics/personal"); if (r.ok) setPersonal(await r.json()); }
    finally { setPersonalLoading(false); }
  }, []);

  const fetchGroups = useCallback(async () => {
    const r = await fetch("/api/social/groups");
    if (r.ok) {
      const d = await r.json();
      const active = (d.groups ?? []).filter((g: Group) => g.my_status === "active");
      setGroups(active);
      if (active.length > 0 && !selectedGroupId) setSelectedGroupId(active[0].id);
    }
  }, [selectedGroupId]);

  const fetchGroupAnalytics = useCallback(async (groupId: string) => {
    setGroupAnalytics(null); setGroupLoading(true);
    try { const r = await fetch(`/api/analytics/group/${groupId}`); if (r.ok) setGroupAnalytics(await r.json()); }
    finally { setGroupLoading(false); }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => { if (data.user) setCurrentUserId(data.user.id); });
  }, []);

  useEffect(() => { fetchTitles(); refresh(); fetchPersonal(); fetchGroups(); }, [fetchTitles, refresh, fetchPersonal, fetchGroups]);
  useEffect(() => { if (mainTab === "group" && selectedGroupId) fetchGroupAnalytics(selectedGroupId); }, [mainTab, selectedGroupId, fetchGroupAnalytics]);

  const paired = streaks.map((r: StreakResult) => ({ result: r, title: titles[r.task_id] ?? "…" }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <PageHeader title="Streaks" accentColor="var(--tab-streaks)" className="mb-4" />
      <SubTabBar tabs={MAIN_TABS} active={mainTab} onChange={setMainTab} accentColor="var(--tab-streaks)" className="mb-5" />

      {mainTab === "personal" && (
        <div className="space-y-6">
          {personalLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : personal && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-5 py-4">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold tabular-nums text-[var(--color-text-primary)]">{personal.momentumScore}</span>
                <div className="mb-1.5 flex items-center gap-1.5">
                  {personal.trend === "up" && (<><TrendingUp className="w-4 h-4 text-green-500" /><span className="text-sm font-medium text-green-500">Rising</span></>)}
                  {personal.trend === "flat" && (<><Minus className="w-4 h-4 text-amber-500" /><span className="text-sm font-medium text-amber-500">Steady</span></>)}
                  {personal.trend === "down" && (<><TrendingDown className="w-4 h-4 text-red-500" /><span className="text-sm font-medium text-red-500">Falling</span></>)}
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-disabled)] mt-1">Based on your last 7 days vs your 30-day average.</p>
            </div>
          )}

          {streaksLoading ? (<div className="flex justify-center py-6"><Spinner /></div>
          ) : streaksError ? (<p className="text-center text-sm text-red-500">{streaksError}</p>
          ) : paired.length === 0 ? (
            <div className="text-center py-10"><Flame className="w-8 h-8 text-[var(--color-text-disabled)] mx-auto mb-3" /><p className="text-sm text-[var(--color-text-secondary)]">No recurring tasks yet.</p></div>
          ) : (
            <div className="space-y-3">{paired.map(({ result, title }) => (<StreakCard key={result.task_id} streak={result} title={title} />))}</div>
          )}

          {personal && personal.heatmapData.length > 0 && <Heatmap data={personal.heatmapData} />}
          {personal && <BestDayChart data={personal.bestDayOfWeek} />}
        </div>
      )}

      {mainTab === "group" && (
        <div className="space-y-6">
          {groups.length === 0 ? (
            <div className="text-center py-16"><p className="text-sm text-[var(--color-text-secondary)]">You are not in any active groups yet.</p></div>
          ) : (
            <>
              {groups.length > 1 && (
                <select value={selectedGroupId ?? ""} onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]">
                  {groups.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
                </select>
              )}
              {groups.length === 1 && <p className="text-base font-semibold text-[var(--color-text-primary)]">{groups[0].name}</p>}
              {groupLoading ? (<div className="flex justify-center py-12"><Spinner /></div>
              ) : groupAnalytics ? (
                <>
                  <GroupMatrix matrix={groupAnalytics.memberMatrix} />
                  <GroupStandings standings={groupAnalytics.standings} currentUserId={currentUserId} />
                  {groupAnalytics.groupRecord && <GroupRecord record={groupAnalytics.groupRecord} />}
                </>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
