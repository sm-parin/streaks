"use client";

import { X, Bell, CheckCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useNotifications } from "@/lib/hooks/use-notifications";
import type { Notification } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

async function patchFriend(friendshipId: string, status: "accepted" | "rejected") {
  await fetch(`/api/social/friends/${friendshipId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

async function putTask(taskId: string, action: "accept" | "reject") {
  await fetch(`/api/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}

function NotifRow({ n, onMarkRead }: { n: Notification; onMarkRead: (id: string) => void }) {
  const payload = n.payload as Record<string, unknown>;
  const dismiss = () => onMarkRead(n.id);
  const handleAction = async (action: () => Promise<void>) => {
    await action();
    onMarkRead(n.id);
  };

  let content: React.ReactNode;

  switch (n.type) {
    case "friend_request": {
      const username = String(payload.from_username ?? payload.username ?? "Someone");
      const fid = String(payload.friendship_id ?? "");
      content = (
        <>
          <p className="text-sm text-[var(--color-text-primary)]">
            <span className="font-medium">{username}</span> sent you a friend request
          </p>
          {fid && (
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleAction(() => patchFriend(fid, "accepted"))} className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--tab-social)] text-white">Accept</button>
              <button onClick={() => handleAction(() => patchFriend(fid, "rejected"))} className="px-3 py-1 text-xs font-medium rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)]">Decline</button>
            </div>
          )}
        </>
      );
      break;
    }
    case "task_assigned": {
      const username = String(payload.assigned_by ?? payload.from_username ?? "Someone");
      const taskTitle = String(payload.task_title ?? payload.title ?? "a task");
      const taskId = String(payload.task_id ?? "");
      content = (
        <>
          <p className="text-sm text-[var(--color-text-primary)]">
            <span className="font-medium">{username}</span> assigned you <span className="font-medium">{taskTitle}</span>
          </p>
          {taskId && (
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleAction(() => putTask(taskId, "accept"))} className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--tab-today)] text-white">Accept</button>
              <button onClick={() => handleAction(() => putTask(taskId, "reject"))} className="px-3 py-1 text-xs font-medium rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)]">Reject</button>
            </div>
          )}
        </>
      );
      break;
    }
    case "group_invite": {
      const username = String(payload.invited_by ?? payload.from_username ?? "Someone");
      const groupName = String(payload.group_name ?? "a group");
      const groupId = String(payload.group_id ?? "");
      content = (
        <>
          <p className="text-sm text-[var(--color-text-primary)]">
            <span className="font-medium">{username}</span> invited you to <span className="font-medium">{groupName}</span>
          </p>
          {groupId && (
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleAction(async () => { await fetch(`/api/social/groups/${groupId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept" }) }); })} className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--tab-social)] text-white">Accept</button>
              <button onClick={dismiss} className="px-3 py-1 text-xs font-medium rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)]">Decline</button>
            </div>
          )}
        </>
      );
      break;
    }
    case "streak_milestone": {
      const days = Number(payload.streak_days ?? payload.days ?? 0);
      const habit = String(payload.task_title ?? payload.habit ?? "a habit");
      content = (
        <>
          <p className="text-sm text-[var(--color-text-primary)]">🔥 You hit a <span className="font-medium">{days}-day streak</span> on <span className="font-medium">{habit}</span>!</p>
          <button onClick={dismiss} className="mt-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Dismiss</button>
        </>
      );
      break;
    }
    case "nudge": {
      const username = String(payload.from_username ?? payload.nudged_by ?? "Someone");
      content = (
        <>
          <p className="text-sm text-[var(--color-text-primary)]">👋 <span className="font-medium">{username}</span> nudged you!</p>
          <button onClick={dismiss} className="mt-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Dismiss</button>
        </>
      );
      break;
    }
    default: {
      const title = String(payload.title ?? n.type);
      content = (
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-[var(--color-text-primary)]">{title}</p>
          {!n.read && <button onClick={dismiss} aria-label="Mark as read"><Check className="w-4 h-4 text-[var(--color-text-secondary)]" /></button>}
        </div>
      );
    }
  }

  return (
    <div className={cn("px-4 py-3 border-b border-[var(--color-border)] last:border-b-0", !n.read && "bg-[var(--color-brand)]/5")}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-disabled)] mb-1">
        {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>
      {content}
    </div>
  );
}

export function NotificationPanel({ isOpen, onClose }: Props) {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-[300] bg-black/40" onClick={onClose} aria-hidden="true" />}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-[310] w-full max-w-sm bg-[var(--color-bg)] flex flex-col",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog" aria-modal="true" aria-label="Notifications"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-text-primary)]">Notifications</h2>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-brand)] transition-colors">
                <CheckCheck className="w-4 h-4" />Mark all read
              </button>
            )}
            <button onClick={onClose} aria-label="Close notifications" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Bell className="w-6 h-6 text-[var(--color-text-disabled)] animate-pulse" /></div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-8 h-8 text-[var(--color-text-disabled)] mx-auto mb-3" />
              <p className="text-sm text-[var(--color-text-secondary)]">All caught up!</p>
            </div>
          ) : (
            notifications.map((n) => <NotifRow key={n.id} n={n} onMarkRead={markRead} />)
          )}
        </div>
      </div>
    </>
  );
}
