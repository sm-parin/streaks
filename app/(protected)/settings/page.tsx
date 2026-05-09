"use client";
import { useState, useEffect, useCallback } from "react";
import { User, Monitor, Settings2, LogOut, ChevronRight, ArrowLeft, Lock } from "lucide-react";
import type { UserStatsCache } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { useUser, setUser } from "@/lib/hooks/use-user";
import { DAY_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type Screen = "main" | "account" | "configure";

function StatValue({ value, isPercent }: { value: number | null; isPercent?: boolean }) {
  if (value === null) return <span className="font-mono text-[var(--color-text-disabled)]">—</span>;
  return (
    <span className="font-mono font-semibold text-[var(--color-text-primary)]">
      {isPercent ? `${value.toFixed(3)}%` : value.toFixed(3)}
    </span>
  );
}

function Percentile({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-[var(--color-text-disabled)]">—</span>;
  return <span className="text-xs text-[var(--color-text-disabled)]">top {(100 - value).toFixed(0)}%</span>;
}

const TIMEZONES = [
  "UTC","America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
  "Europe/London","Europe/Paris","Europe/Berlin","Asia/Kolkata","Asia/Tokyo",
  "Asia/Singapore","Australia/Sydney",
];

export default function SettingsPage() {
  const { user, refetch } = useUser();
  const { showToast } = useToast();
  const [screen, setScreen] = useState<Screen>("main");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [activeDays, setActiveDays] = useState<number[]>(
    user?.default_active_days ?? [0, 1, 2, 3, 4, 5, 6]
  );
  const [timezone, setTimezone] = useState(
    user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [configLoading, setConfigLoading] = useState(false);
  const [statsData, setStatsData] = useState<UserStatsCache | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchStats = useCallback(async (userId: string) => {
    setStatsLoading(true);
    try {
      const r = await fetch(`/api/profile/stats/${userId}`);
      if (r.ok) { const d = await r.json(); setStatsData(d.stats ?? null); }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { if (user?.id) fetchStats(user.id); }, [user?.id, fetchStats]);

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) return showToast("Password must be at least 8 characters", "error");
    if (newPw !== confirmPw) return showToast("Passwords do not match", "error");
    setPwLoading(true);
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
    });
    const d = await r.json();
    setPwLoading(false);
    if (!r.ok) showToast(d.error ?? "Password change failed", "error");
    else { showToast("Password updated", "success"); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
  };

  const handleConfigSave = async () => {
    setConfigLoading(true);
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ default_active_days: activeDays, timezone }),
    });
    const d = await r.json();
    setConfigLoading(false);
    if (!r.ok) showToast(d.error ?? "Save failed", "error");
    else { showToast("Settings saved", "success"); await refetch(); }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/login";
  };

  const toggleDay = (d: number) =>
    setActiveDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  if (screen === "account") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setScreen("main")} className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Account</h1>
        </div>
        <div className="space-y-1 mb-6">
          <Label>Email</Label>
          <div className="px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]">
            {user?.email ?? "—"}
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Change Password</h2>
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
          <form onSubmit={handlePasswordSave} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="cur-pw">Current password</Label>
              <Input id="cur-pw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-pw">New password</Label>
              <Input id="new-pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="conf-pw">Confirm new password</Label>
              <Input id="conf-pw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
            </div>
            <Button type="submit" size="sm" loading={pwLoading}>Change Password</Button>
          </form>
        </div>
      </div>
    );
  }

  if (screen === "configure") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setScreen("main")} className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Configure</h1>
        </div>
        <div className="space-y-5">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Default Active Days</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">New tasks will use these days by default.</p>
            </div>
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
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Timezone</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Drives all time-based features.</p>
            </div>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
            >
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <Button onClick={handleConfigSave} loading={configLoading} className="w-full">Save</Button>
        </div>
      </div>
    );
  }

  const navRows: { icon: React.ElementType; label: string; desc: string; dest: Screen }[] = [
    { icon: User,      label: "Account",   desc: "Email, password",        dest: "account" },
    { icon: Settings2, label: "Configure", desc: "Default days, timezone", dest: "configure" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <PageHeader title="Settings" accentColor="var(--color-brand)" />
      <div className="space-y-3">
        {navRows.map(({ icon: Icon, label, desc, dest }) => (
          <button key={label} onClick={() => setScreen(dest)}
            className="w-full flex items-center gap-3 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] hover:bg-[var(--color-bg-secondary)] transition-colors text-left">
            <Icon className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        ))}
        <div className="flex items-center gap-3 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)]">
          <Monitor className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Theme</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Light, dark, or system</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
      {/* ── Your Stats ── */}
      {statsLoading ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 space-y-3 animate-pulse mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-[var(--color-border)] rounded" style={{ width: `${60 + i * 8}%` }} />
          ))}
        </div>
      ) : statsData ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide px-1">Your Stats</p>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 space-y-2.5">
            <p className="text-[10px] font-semibold text-[var(--color-text-disabled)] uppercase tracking-wide">Streak Stats</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--color-text-primary)]">Consistency Rating</span>
              <div className="flex items-center gap-2">
                <StatValue value={statsData.streak_consistency_rating} />
                <Percentile value={statsData.streak_consistency_percentile} />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--color-text-primary)]">Discipline</span>
              <div className="flex items-center gap-2">
                <StatValue value={statsData.streak_discipline_pct} isPercent />
                <Percentile value={statsData.streak_discipline_percentile} />
              </div>
            </div>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 space-y-2.5">
            <p className="text-[10px] font-semibold text-[var(--color-text-disabled)] uppercase tracking-wide">Milestone Stats</p>
            <div className="flex justify-between items-start">
              <span className="text-sm text-[var(--color-text-primary)]">Today · Week · Month · Year</span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <StatValue value={statsData.daily_milestone} />
                <span className="text-[var(--color-text-disabled)] text-xs">·</span>
                <StatValue value={statsData.weekly_milestone} />
                <span className="text-[var(--color-text-disabled)] text-xs">·</span>
                <StatValue value={statsData.monthly_milestone} />
                <span className="text-[var(--color-text-disabled)] text-xs">·</span>
                <StatValue value={statsData.yearly_milestone} />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--color-text-primary)]">Consistency Rating</span>
              <div className="flex items-center gap-2">
                <StatValue value={statsData.milestone_consistency_rating} />
                <Percentile value={statsData.milestone_consistency_percentile} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-disabled)] text-center mt-4">Stats not available yet. Check back tomorrow.</p>
      )}

      <div className="mt-8">
        <Button
          variant="ghost"
          className="w-full text-[var(--color-error)] hover:bg-[var(--color-error-bg)]"
          onClick={handleLogout}
          leftIcon={<LogOut className="w-4 h-4" />}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
