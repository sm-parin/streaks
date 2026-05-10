"use client";
import { useRef } from "react";
import { useTags } from "@/lib/hooks/use-tags";
import { useUser } from "@/lib/hooks/use-user";
import { useProfileCache } from "@/lib/hooks/use-profile-cache";
import type { Task } from "@/lib/types";

// â”€â”€ Priority colour map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface TaskCardProps {
  task: Task;
  /** Dims body + strikes title when true. Priority colour system stays intact. */
  completedToday?: boolean;
  /** true = Habits tab (show day row). false = Today/Social/etc. */
  showDays?: boolean;
  /** Single tap â†’ info modal */
  onClick?: () => void;
  /** Double tap â†’ edit modal */
  onDoubleClick?: () => void;
  /** Group name override; falls back to task.group_name */
  groupName?: string;
  /** Optional tag list override â€” bypasses useTags() (used in preview / ListCard injection) */
  tagsOverride?: { id: string; name: string; color: string }[];
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function TaskCard({
  task,
  completedToday = false,
  showDays = false,
  onClick,
  onDoubleClick,
  groupName,
  tagsOverride,
}: TaskCardProps) {
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { tags: hookTags } = useTags();
  const { user } = useUser();

  // Prefetch assigner profile (single-card fallback â€” list-level batch handles most)
  const assignerId = task.assigner_user_id ?? "";
  const getProfile = useProfileCache(assignerId ? [assignerId] : []);

  // â”€â”€ Derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // Tags for this task (sourced from module-level tag cache â€” no extra fetch)
  const tags = tagsOverride ?? hookTags;
  const taskTags = tags.filter((t) => task.tag_ids?.includes(t.id));

  // Time split for two-line display
  const timeHH = task.time_from ? task.time_from.slice(0, 2) : null;
  const timeMM = task.time_from ? task.time_from.slice(3, 5) : null;

  // Card background: priority colour at ~6% opacity (0F hex)
  const bgTint = priorityColor + "0F";

  // Visibility: only show assigner if it's a different user; only show group if set
  const showAssigner = !!assignerId && assignerId !== user?.id;
  const showGroup = !!groupInitial;

  // â”€â”€ Single vs double click â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleClick = () => {
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      if (clickCount.current === 1) onClick?.();
      else if (clickCount.current >= 2) onDoubleClick?.();
      clickCount.current = 0;
    }, 220);
  };

  // â”€â”€ Left cell shared style â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const cellBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
  };

  // Whether the left panel should render at all
  const showLeftPanel = showAssigner;

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      style={{
        display: "flex",
        flexDirection: "row",
        height: "72px",
        borderRadius: "0 var(--radius-lg) var(--radius-lg) 0",
        backgroundColor: bgTint,
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
        userSelect: "none",
        opacity: isCompleted ? 0.6 : 1,
      }}
    >
      {/* â”€â”€ LEFT SIDE â€” time panel or priority strip â”€â”€ */}
      {task.time_from ? (
        /* Two-square time panel */
        <div style={{ width: "36px", flexShrink: 0, alignSelf: "stretch", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              flex: 1,
              backgroundColor: priorityColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#FFFFFF", fontSize: "16px", fontWeight: 700, fontFamily: "monospace" }}>
              {timeHH}
            </span>
          </div>
          {/* Colon separator */}
          <div style={{ height: "4px", backgroundColor: priorityColor, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "2px" }}>
            <div style={{ width: "3px", height: "3px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.8)" }} />
            <div style={{ width: "3px", height: "3px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.8)" }} />
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: priorityColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#FFFFFF", fontSize: "16px", fontWeight: 700, fontFamily: "monospace" }}>
              {timeMM}
            </span>
          </div>
        </div>
      ) : (
        /* Thin 4px priority strip */
        <div style={{ width: "4px", flexShrink: 0, backgroundColor: priorityColor }} />
      )}

      {/* â”€â”€ MAIN BODY â”€â”€ */}
      <div
        style={{
          flex: 1,
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "4px",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Row 1 â€” Title: priority colour, bold, 1-line ellipsis */}
        <div
          style={{
            color: priorityColor,
            fontWeight: 700,
            fontSize: "15px",
            lineHeight: "1.35",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textDecoration: isCompleted ? "line-through" : "none",
          }}
        >
          {task.title}
        </div>

        {/* Row 2 â€” Description: muted, 2-line ellipsis */}
        {task.description && (
          <div
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "12px",
              lineHeight: "1.35",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {task.description}
          </div>
        )}

        {/* Row 3 â€” Day indicators (Habits tab only) */}
        {showDays && (
          <div style={{ display: "flex", gap: "3px", marginTop: "2px" }}>
            {task.is_global ? (
              <span style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>âˆž</span>
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

      {/* â”€â”€ RIGHT PANEL â€” assigner/group, only when assigner is present â”€â”€ */}
      {showLeftPanel && (
        <div
          style={{
            width: "36px",
            flexShrink: 0,
            alignSelf: "stretch",
            display: "flex",
            flexDirection: "column",
            justifyContent: showGroup ? "flex-start" : "center",
            backgroundColor: "var(--color-surface-raised)",
            borderLeft: "1px solid var(--color-border)",
          }}
        >
          {/* Assigner initial */}
          <div
            style={{ ...cellBase, borderBottom: showGroup ? "1px solid var(--color-border)" : undefined }}
            title="Assigned by"
          >
            {assignerInitial}
          </div>
          {/* Group initial â€” only when both present */}
          {showGroup && (
            <div style={{ ...cellBase }} title={groupDisplay ?? undefined}>
              {groupInitial}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
