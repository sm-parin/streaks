"use client";
import { Flame } from "lucide-react";
import type { StreakResult, DayStatus, Priority } from "@/lib/types";
import { PRIORITY_COLORS } from "@/lib/types";

interface Props {
  streak: StreakResult;
  title: string;
  priority: Priority;
  allowGrace: boolean;
}

function ActivityDot({ status, date }: { status: DayStatus; date: string }) {
  if (status === "not_scheduled") {
    return <div style={{ width: "6px", height: "6px" }} />;
  }
  const styles: Record<Exclude<DayStatus, "not_scheduled">, React.CSSProperties> = {
    completed: { width: "11px", height: "11px", borderRadius: "50%", backgroundColor: "var(--tab-streaks)" },
    grace:     { width: "11px", height: "11px", borderRadius: "50%", border: "2px solid #F59E0B", backgroundColor: "transparent" },
    missed:    { width: "11px", height: "11px", borderRadius: "50%", backgroundColor: "var(--color-border)", opacity: 0.45 },
  };
  return <div style={styles[status as Exclude<DayStatus, "not_scheduled">]} title={`${date}: ${status}`} />;
}

export function StreakCard({ streak, title, priority, allowGrace }: Props) {
  const { currentStreak, longestStreak, timesStreakBroken, completedToday, lastCompleted, recentDays } = streak;
  const priorityColor = PRIORITY_COLORS[priority] ?? "#F07F13";

  return (
    <div
      className="border border-[var(--color-border)] bg-[var(--color-surface-raised)]"
      style={{
        borderRadius: "var(--radius-lg)",
        borderLeftWidth: "4px",
        borderLeftColor: priorityColor,
        padding: "12px",
      }}
    >
      {/* ── Header row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <Flame
          style={{ width: "24px", height: "24px", flexShrink: 0,
            color: completedToday ? "#EF4444" : "var(--color-text-disabled)" }}
        />
        <span style={{ flex: 1, fontWeight: 700, fontSize: "15px", color: "var(--color-text-primary)", lineHeight: 1.3, wordBreak: "break-word" }}>
          {title}
        </span>
        {allowGrace && (
          <span style={{ fontSize: "10px", fontWeight: 600, color: "#92400E", backgroundColor: "#FEF3C7",
            borderRadius: "4px", padding: "2px 6px", flexShrink: 0 }}>
            grace on
          </span>
        )}
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        {([
          { label: "Current", value: String(currentStreak) },
          { label: "Best",    value: String(longestStreak) },
          { label: "Broken",  value: `${timesStreakBroken}×` },
        ] as const).map(({ label, value }) => (
          <div key={label} style={{ flex: 1, backgroundColor: "var(--color-bg)", borderRadius: "var(--radius-sm)", padding: "6px 8px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "2px" }}>{label}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1, tabularNums: true } as React.CSSProperties}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Activity strip (14 days) ── */}
      <div style={{ display: "flex", gap: "3px", alignItems: "center", marginBottom: "8px" }}>
        {recentDays.map(({ date, status }) => (
          <div key={date} style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <ActivityDot status={status} date={date} />
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div style={{ fontSize: "11px", color: "var(--color-text-disabled)" }}>
        {lastCompleted ? `Last completed: ${lastCompleted}` : "Never completed"}
      </div>
    </div>
  );
}
