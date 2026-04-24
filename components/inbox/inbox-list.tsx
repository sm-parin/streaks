"use client";

import { useState, useEffect } from "react";
import { Bell, Loader2, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SubTabBar, type SubTab } from "@/components/ui/subtab-bar";
import { type Notification } from "@/lib/types";
import { useNotifications } from "@/lib/hooks/use-notifications";

type InboxTab = "all" | "notifications" | "incoming" | "friends";

const TABS: SubTab<InboxTab>[] = [
  { id: "all",           label: "All"              },
  { id: "notifications", label: "Notifications"    },
  { id: "incoming",      label: "Incoming Records" },
  { id: "friends",       label: "Friend Requests"  },
];

/** Maps a raw notification type to a subtab id */
function notifTab(n: Notification): InboxTab {
  if (n.type === "friend_request" || n.type === "friend_accepted") return "friends";
  if (n.type === "task_assigned"  || n.type === "task_accepted"  || n.type === "task_rejected")
    return "incoming";
  return "notifications";
}

const TYPE_LABEL: Record<string, string> = {
  friend_request:  "Friend Request",
  friend_accepted: "Friend Accepted",
  task_assigned:   "Task Assigned",
  task_accepted:   "Task Accepted",
  task_rejected:   "Task Rejected",
  reminder:        "Reminder",
};

/** Individual notification card */
function NotifCard({ n, onMarkRead }: { n: Notification; onMarkRead: (id: string) => void }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-lg border border-[var(--color-border)]",
        !n.read && "bg-[var(--color-brand)]/5 border-[var(--color-brand)]/25"
      )}
    >
      <Bell className="w-4 h-4 mt-0.5 shrink-0 text-[var(--tab-inbox)]" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
          {TYPE_LABEL[n.type] ?? n.type}
        </p>
        <p className="text-sm text-[var(--color-text-primary)] mt-0.5 line-clamp-2">
          {(n.payload as { title?: string })?.title ?? JSON.stringify(n.payload)}
        </p>
        <p className="text-[11px] text-[var(--color-text-disabled)] mt-1">
          {new Date(n.created_at).toLocaleDateString(undefined, {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>
      {!n.read && (
        <button
          onClick={() => onMarkRead(n.id)}
          aria-label="Mark as read"
          className="shrink-0 text-[var(--color-text-secondary)] hover:text-[var(--color-brand)] transition-colors"
        >
          <Check className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/** Inbox list with filtered subtabs */
export function InboxList() {
  const { notifications, loading, markRead, markAllRead, refresh } = useNotifications();
  const [activeTab, setActiveTab] = useState<InboxTab>("all");

  useEffect(() => { refresh(); }, [refresh]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered =
    activeTab === "all"
      ? notifications
      : notifications.filter((n) => notifTab(n) === activeTab);

  const tabsWithCounts: SubTab<InboxTab>[] = TABS.map((t) => ({
    ...t,
    count: t.id === "all"
      ? unreadCount || undefined
      : notifications.filter((n) => !n.read && notifTab(n) === t.id).length || undefined,
  }));

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Inbox</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-brand)] transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Underline subtab bar */}
      <SubTabBar
        tabs={tabsWithCounts}
        active={activeTab}
        onChange={setActiveTab}
        accentColor="var(--tab-inbox)"
        className="mb-5 -mx-4 px-4"
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-secondary)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-8 h-8 text-[var(--color-text-disabled)] mx-auto mb-3" />
          <p className="text-sm text-[var(--color-text-secondary)]">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <NotifCard key={n.id} n={n} onMarkRead={markRead} />
          ))}
        </div>
      )}
    </>
  );
}
