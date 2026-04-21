"use client";
import { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, Bell, Search, UserCheck, Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { TAB_COLORS } from "@/lib/types";
import { FriendsList } from "@/components/social/friends-list";
import { GroupsList } from "@/components/social/groups-list";
import { NotificationsList } from "@/components/social/notifications-list";
import { FindFriends } from "@/components/social/find-friends";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { cn } from "@/lib/utils/cn";

type Section = "notifications" | "friends" | "groups" | "find";

export default function SocialPage() {
  const [section, setSection] = useState<Section>("notifications");
  const { unreadCount } = useNotifications();

  const tabs: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "friends",       label: "Friends",       icon: UserCheck },
    { id: "groups",        label: "Groups",        icon: Shield },
    { id: "find",          label: "Find",          icon: Search },
  ];

  return (
    <div>
      <PageHeader title="Social" accentColor={TAB_COLORS.social} />

      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 transition-colors relative",
              section === id
                ? "text-white border-[var(--color-social)]"
                : "bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
            )}
            style={section === id ? { backgroundColor: TAB_COLORS.social, borderColor: TAB_COLORS.social } : undefined}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {id === "notifications" && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-error)] text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {section === "notifications" && <NotificationsList />}
      {section === "friends"       && <FriendsList />}
      {section === "groups"        && <GroupsList />}
      {section === "find"          && <FindFriends />}
    </div>
  );
}
