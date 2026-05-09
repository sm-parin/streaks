"use client";
import { useRef } from "react";
import { useTags } from "@/lib/hooks/use-tags";
import { useUser } from "@/lib/hooks/use-user";
import { useProfileCache } from "@/lib/hooks/use-profile-cache";
import type { Task } from "@/lib/types";

// ── Priority colour map ────────────────────────────────────────────────────
const PRIORITY_COLOR_MAP: Record<number, string> = {
  1: "#EF4444", // P1 red
  2: "#EAB308", // P2 yellow-amber
  3: "#F07F13", // P3 orange / brand
  4: "#3B82F6", // P4 blue
  5: "#22C55E", // P5 green
};

// Sun=0 Mon=1 Tue=2 Wed=3 Thu=4 Fri=5 Sat=6
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const DAY_INDICES = [0, 1, 2, 3, 4, 5, 6] as const;

// ── Props ──────────────────────────────────────────────────────────────────
export interface TaskCardProps {
  task: Task;
  /** Dims body + strikes title when true. Priority colour system stays intact. */
  completedToday?: boolean;
  /** true = Habits tab (show day row). false = Today/Social/etc. */
  showDays?: boolean;
  /** Single tap → info modal */
  onClick?: () => void;
  /** Double tap → edit modal */
  onDoubleClick?: () => void;
  /** Group name override; falls back to task.group_name */
  groupName?: string;
}

// ── Component ──────────────────────────────────────────────────────────────
export function TaskCard({
  task,
  completedToday = false,
  showDays = false,
  onClick,
  onDoubleClick,
  groupName,
}: TaskCardProps) {
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { tags } = useTags();
  const { user } = useUser();

  // Prefetch assigner profile (single-card fallback — list-level batch handles most)
  const assignerId = task.assigner_user_id ?? "";
  const getProfile = useProfileCache(assignerId ? [assignerId] : []);

  // ── Derived ──────────────────────────────────────────────────────────────
  const priorityColor = PRIORITY_COLOR_MAP[task.priority] ?? "#F07F13";
  const isCompleted = completedToday || (!task.is_recurring && task.status === "completed");

  // Assigner initial: their username initial if assigned-by someone, else own initial
  const assignerProfile = assignerId ? getProfile(assignerId) : null;
  const assignerInitial = (
    assignerProfile?.username?.charAt(0) ?? user?.username?.charAt(0) ?? "?"
  ).toUpperCase();

  // Group initial
  const groupDisplay = groupName ?? task.group_name ?? null;
  const groupInitial = groupDisplay ? groupDisplay.charAt(0).toUpperCase() : null;

  // Tags for this task (sourced from module-level tag cache — no extra fetch)
  const taskTags = tags.filter((t) => task.tag_ids?.includes(t.id));

  // Time split for two-line display
  const timeHH = task.time_from ? task.time_from.slice(0, 2) : null;
  const timeMM = task.time_from ? task.time_from.slice(3, 5) : null;

  // Card background: priority colour at ~6% opacity (0F hex)
  const bgTint = priorityColor + "0F";

  // ── Single vs double click ────────────────────────────────────────────────
  const handleClick = () => {
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      if (clickCount.current === 1) onClick?.();
      else if (clickCount.current >= 2) onDoubleClick?.();
      clickCount.current = 0;
    }, 220);
  };

  // ── Left cell shared style ────────────────────────────────────────────────
  const cellBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    backgroundColor: "var(--color-surface-raised)",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      style={{
        display: "flex",
        flexDirection: "row",
        borderRadius: "var(--radius-lg)",
        backgroundColor: bgTint,
        minHeight: "72px",
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {/* ── LEFT PANEL (56px wide) ── */}
      <div style={{ width: "56px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        {/* TOP — assigner initial */}
        <div
          style={{
            ...cellBase,
            flex: 1,
            borderRight: "1px solid var(--color-border)",
            borderBottom: "1px solid var(--color-border)",
          }}
          title={assignerId ? "Assigned by" : "Created by you"}
        >
          {assignerInitial}
        </div>
        {/* BOTTOM — group initial */}
        <div
          style={{
            ...cellBase,
            flex: 1,
            borderRight: "1px solid var(--color-border)",
            opacity: groupInitial ? 1 : 0.3,
          }}
          title={groupDisplay ?? undefined}
        >
          {groupInitial ?? ""}
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div
        style={{
          flex: 1,
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          opacity: isCompleted ? 0.55 : 1,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Row 1 — Title: priority colour, bold */}
        <div
          style={{
            color: priorityColor,
            fontWeight: 700,
            fontSize: "15px",
            lineHeight: "1.3",
            wordBreak: "break-word",
            textDecoration: isCompleted ? "line-through" : "none",
          }}
        >
          {task.title}
        </div>

        {/* Row 2 — Description: muted, single-line ellipsis */}
        {task.description && (
          <div
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "13px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {task.description}
          </div>
        )}

        {/* Row 3 — Tag pills */}
        {taskTags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {taskTags.map((tag) => (
              <span
                key={tag.id}
                style={{
                  backgroundColor: tag.color + "33",
                  color: tag.color,
                  borderRadius: "var(--radius-sm)",
                  fontSize: "11px",
                  padding: "2px 8px",
                  fontWeight: 500,
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Row 4 — Day indicators (Habits tab only) */}
        {showDays && (
          <div style={{ display: "flex", gap: "3px", marginTop: "2px" }}>
            {task.is_global ? (
              <span style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>∞</span>
            ) : (
              DAY_INDICES.map((dayIndex) => {
                const isActive = task.active_days?.includes(dayIndex) ?? false;
                return (
                  <div
                    key={dayIndex}
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "var(--radius-sm)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: isActive ? 700 : 400,
                      backgroundColor: isActive ? priorityColor : "var(--color-bg)",
                      color: isActive ? "#FFFFFF" : "var(--color-text-secondary)",
                    }}
                  >
                    {DAY_LETTERS[dayIndex]}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT SIDE ── */}
      {task.time_from ? (
        /* Full-height coloured time panel */
        <div
          style={{
            width: "52px",
            flexShrink: 0,
            backgroundColor: priorityColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <span
            style={{
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 700,
              fontFamily: "monospace",
              lineHeight: "1.2",
              textAlign: "center",
            }}
          >
            {timeHH}
            <br />
            {timeMM}
          </span>
        </div>
      ) : (
        /* Thin 4px priority strip */
        <div
          style={{
            width: "4px",
            flexShrink: 0,
            backgroundColor: priorityColor,
          }}
        />
      )}
    </div>
  );
}
