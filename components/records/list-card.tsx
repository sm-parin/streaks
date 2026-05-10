"use client";
import { useState } from "react";
import { CheckCircle, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { type List, type Task, PRIORITY_COLORS } from "@/lib/types";
import { TaskCard } from "@/components/tasks/task-card";
import { SwipeableWrapper } from "@/components/records/swipeable-wrapper";
import { useUser } from "@/lib/hooks/use-user";
import { useProfileCache } from "@/lib/hooks/use-profile-cache";

interface ListCardProps {
  list: List & { tasks: Task[] };
  completedIds?: Set<string>;
  tags?: { id: string; name: string; color: string }[];
  onTaskClick?: (task: Task) => void;
  onTaskDoubleClick?: (task: Task) => void;
  onTaskToggle?: (taskId: string, isRecurring: boolean) => void;
  onListClick?: () => void;
  className?: string;
}

export function ListCard({
  list,
  completedIds = new Set(),
  tags = [],
  onTaskClick,
  onTaskDoubleClick,
  onTaskToggle,
  onListClick,
  className,
}: ListCardProps) {
  const [expanded, setExpanded] = useState(false);

  const { user } = useUser();
  const tasks = list.tasks ?? [];
  const taskCount = tasks.length;
  const completedCount = tasks.filter(
    (t) => completedIds.has(t.id) || t.status === "completed"
  ).length;

  // Sort: incomplete first â€” drives both display order AND attribute source
  const sortedTasks = [...tasks].sort((a, b) => {
    const aComp = completedIds.has(a.id) || a.status === "completed" ? 1 : 0;
    const bComp = completedIds.has(b.id) || b.status === "completed" ? 1 : 0;
    return aComp - bComp;
  });

  // Derive visual attributes from the first INCOMPLETE task (updates when tasks are toggled)
  const firstTask = sortedTasks[0] ?? null;

  const priorityColor = firstTask ? PRIORITY_COLORS[firstTask.priority] : PRIORITY_COLORS[3];
  const bgTint = priorityColor + "0F";
  const timeHH = firstTask?.time_from?.slice(0, 2) ?? null;
  const timeMM = firstTask?.time_from?.slice(3, 5) ?? null;
  const groupDisplay = firstTask?.group_name ?? null;
  const groupInitial = groupDisplay ? groupDisplay.charAt(0).toUpperCase() : null;

  const assignerId = firstTask?.assigner_user_id ?? "";
  const getProfile = useProfileCache(assignerId ? [assignerId] : []);
  const assignerProfile = assignerId ? getProfile(assignerId) : null;
  const assignerInitial = (
    assignerProfile?.username?.charAt(0) ?? user?.username?.charAt(0) ?? "?"
  ).toUpperCase();

  // Visibility: only show assigner if it's a different user; only show group if set
  const showAssigner = !!assignerId && assignerId !== user?.id;
  const showGroup = !!groupInitial;

  const handleListClick = () => {
    setExpanded((v) => !v);
    onListClick?.();
  };

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

  return (
    <div className={cn(className)}>

      {/* â”€â”€ Card + bottom-peek stack shadows â”€â”€ */}
      <div style={{ position: "relative", isolation: "isolate" }}>

        {/* Shadow 2 â€” deepest, peeks furthest below */}
        {!expanded && taskCount > 2 && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "12px",
              right: "0",
              bottom: "-7px",
              height: "7px",
              borderRadius: "0 0 var(--radius-lg) 0",
              borderBottom: "1px solid var(--color-border)",
              borderRight: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface)",
              zIndex: 0,
              opacity: 0.65,
            }}
          />
        )}

        {/* Shadow 1 â€” slightly behind, peeks 4px below */}
        {!expanded && taskCount > 1 && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "6px",
              right: "0",
              bottom: "-4px",
              height: "4px",
              borderRadius: "0 0 var(--radius-lg) 0",
              borderBottom: "1px solid var(--color-border)",
              borderRight: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface-raised)",
              zIndex: 1,
              opacity: 0.85,
            }}
          />
        )}

        {/* â”€â”€ Main list card â”€â”€ */}
        <div style={{ display: "flex", flexDirection: "row", zIndex: 2, position: "relative" }}>
          {/* Card body â€” overflow hidden for internal clipping only */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleListClick}
            onKeyDown={(e) => e.key === "Enter" && handleListClick()}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "row",
              height: "72px",
              borderRadius: "0 0 0 0",
              backgroundColor: bgTint,
              border: "1px solid var(--color-border)",
              borderRight: "none",
              overflow: "hidden",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
          {/* LEFT SIDE â€” time panel or priority strip */}
          {timeHH ? (
            <div style={{ width: "36px", flexShrink: 0, alignSelf: "stretch", display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, backgroundColor: priorityColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#FFFFFF", fontSize: "16px", fontWeight: 700, fontFamily: "monospace" }}>{timeHH}</span>
              </div>
              {/* Colon separator */}
              <div style={{ height: "4px", backgroundColor: priorityColor, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                <div style={{ width: "3px", height: "3px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.8)" }} />
                <div style={{ width: "3px", height: "3px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.8)" }} />
              </div>
              <div style={{ flex: 1, backgroundColor: priorityColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#FFFFFF", fontSize: "16px", fontWeight: 700, fontFamily: "monospace" }}>{timeMM}</span>
              </div>
            </div>
          ) : (
            <div style={{ width: "4px", flexShrink: 0, backgroundColor: priorityColor }} />
          )}

          {/* MAIN BODY */}
          <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "4px", minWidth: 0, overflow: "hidden" }}>
            <div style={{ color: priorityColor, fontWeight: 700, fontSize: "15px", lineHeight: "1.3", wordBreak: "break-word" }}>
              {list.title}
            </div>
            <div style={{ color: "var(--color-text-secondary)", fontSize: "13px" }}>
              {completedCount} / {taskCount} done
            </div>
          </div>

          {/* RIGHT PANEL â€” assigner/group, only when assigner is present */}
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
              <div
                style={{ ...cellBase, borderBottom: showGroup ? "1px solid var(--color-border)" : undefined }}
                title="Assigned by"
              >
                {assignerInitial}
              </div>
              {showGroup && (
                <div style={{ ...cellBase }} title={groupDisplay ?? undefined}>
                  {groupInitial}
                </div>
              )}
            </div>
          )}
          </div>
          {/* Permanent 4px priority strip â€” outside overflow:hidden so it's never clipped */}
          <div
            style={{
              width: "4px",
              height: "72px",
              flexShrink: 0,
              backgroundColor: priorityColor,
              borderRadius: expanded ? "0" : "0 var(--radius-lg) var(--radius-lg) 0",
            }}
          />
        </div>
      </div>

      {/* â”€â”€ Animated expand/collapse panel â”€â”€ */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: expanded ? "1fr" : "0fr",
          transition: "grid-template-rows 280ms ease",
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <div className="space-y-1.5" style={{ paddingTop: "6px", paddingBottom: "2px", paddingRight: "6px", borderRight: `4px solid ${priorityColor}` }}>
            {sortedTasks.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--color-text-secondary)] italic">
                No tasks in this list
              </p>
            ) : (
              sortedTasks.map((task) => {
                const isDone = completedIds.has(task.id) || task.status === "completed";
                return (
                  <SwipeableWrapper
                    key={task.id}
                    onSwipeRight={onTaskToggle && !isDone ? () => onTaskToggle(task.id, task.is_recurring) : undefined}
                    onSwipeLeft={onTaskToggle && isDone ? () => onTaskToggle(task.id, task.is_recurring) : undefined}
                    rightLabel="Done"
                    leftLabel="Undo"
                    rightIcon={<CheckCircle className="w-4 h-4" />}
                    leftIcon={<Undo2 className="w-4 h-4" />}
                  >
                    <TaskCard
                      task={task}
                      completedToday={isDone}
                      showDays={false}
                      tagsOverride={tags}
                      onClick={() => onTaskClick?.(task)}
                      onDoubleClick={() => onTaskDoubleClick?.(task)}
                    />
                  </SwipeableWrapper>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

