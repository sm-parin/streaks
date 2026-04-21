"use client";
import { Bell, UserPlus, Activity, Users, Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/hooks/use-notifications";
import type { Notification, NotificationType } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

function NotifIcon({ type }: { type: NotificationType }) {
  if (type.startsWith("friend")) return <UserPlus className="w-4 h-4" />;
  if (type.startsWith("activity")) return <Activity className="w-4 h-4" />;
  if (type.startsWith("group")) return <Users className="w-4 h-4" />;
  return <Bell className="w-4 h-4" />;
}

function notifLabel(n: Notification): string {
  const d = n.data as Record<string, string>;
  switch (n.type) {
    case "friend_request":   return `@${d.from_username} sent you a friend request`;
    case "friend_accepted":  return `@${d.from_username} accepted your friend request`;
    case "activity_assigned":return `@${d.from_username} assigned "${d.activity_title}" to you`;
    case "activity_accepted":return `@${d.from_username} accepted "${d.activity_title}"`;
    case "activity_rejected":return `@${d.from_username} declined "${d.activity_title}"`;
    case "group_invite":     return `@${d.from_username} invited you to "${d.group_name}"`;
    case "group_accepted":   return `@${d.from_username} joined your group`;
    default: return "New notification";
  }
}

export function NotificationsList() {
  const { notifications, loading, unreadCount, markAllRead } = useNotifications();

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div>
      {unreadCount > 0 && (
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-[var(--color-text-secondary)]">{unreadCount} unread</span>
          <Button size="sm" variant="ghost" onClick={markAllRead} leftIcon={<Check className="w-3.5 h-3.5" />}>
            Mark all read
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={cn(
              "flex items-start gap-3 p-3 rounded-[var(--radius-lg)] border",
              n.read ? "bg-[var(--color-surface)] border-[var(--color-border)] opacity-70" : "bg-[var(--color-brand-light)] border-[var(--color-brand)]"
            )}>
              <div className="mt-0.5 text-[var(--color-brand)] shrink-0">
                <NotifIcon type={n.type} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-text-primary)]">{notifLabel(n)}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  {new Date(n.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
