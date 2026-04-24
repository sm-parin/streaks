"use client";
import { useState, useEffect } from "react";
import { Bell, Loader2, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { type Notification } from "@/lib/types";
import { useNotifications } from "@/lib/hooks/use-notifications";

const SUBTABS = ["All", "Notifications", "Incoming Records", "Friend Requests"] as const;
type Subtab = typeof SUBTABS[number];

function notifType(n: Notification): Subtab {
  if (n.type === "friend_request" || n.type === "friend_accepted") return "Friend Requests";
  if (n.type === "task_assigned" || n.type === "task_accepted" || n.type === "task_rejected")
    return "Incoming Records";
  return "Notifications";
}

function NotifCard({ n, onMarkRead }: { n: Notification; onMarkRead: (id: string) => void }) {
  const label: Record<string, string> = {
    friend_request: "Friend Request",
    friend_accepted: "Friend Accepted",
    task_assigned: "Task Assigned",
    task_accepted: "Task Accepted",
    task_rejected: "Task Rejected",
    reminder: "Reminder",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl border border-[var(--color-border)]",
        !n.read && "bg-[var(--color-brand)]/5 border-[var(--color-brand)]/20"
      )}
    >
      <div className="mt-0.5">
        <Bell className="w-4 h-4 text-[var(--tab-inbox)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
          {label[n.type] ?? n.type}
        </p>
        <p className="text-sm text-[var(--color-text-primary)] mt-0.5 line-clamp-2">
          {(n.payload as { title?: string })?.title ?? JSON.stringify(n.payload)}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
          {new Date(n.created_at).toLocaleDateString(undefined, {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>
      {!n.read && (
        <button
          onClick={() => onMarkRead(n.id)}
          className="shrink-0 text-[var(--color-text-secondary)] hover:text-[var(--color-brand)] transition-colors"
          aria-label="Mark as read"
        >
          <Check className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function InboxList() {
  const { notifications, loading, markRead, markAllRead, refresh } = useNotifications();
  const [activeTab, setActiveTab] = useState<Subtab>("All");

  useEffect(() => { refresh(); }, [refresh]);

  const filtered =
    activeTab === "All"
      ? notifications
      : notifications.filter((n) => notifType(n) === activeTab);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
            Inbox
            {unreadCount > 0 && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--tab-inbox)] text-white font-medium">
                {unreadCount}
              </span>
            )}
          </h1>
        </div>
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

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {SUBTABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
              activeTab === tab
                ? "border-[var(--tab-inbox)] text-white"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
            )}
            style={activeTab === tab ? { backgroundColor: "var(--tab-inbox)" } : {}}
          >
            {tab}
          </button>
        ))}
      </div>

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
