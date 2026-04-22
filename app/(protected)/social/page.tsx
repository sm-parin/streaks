"use client";
import { useState } from "react";
import { UserCheck, Shield, UserPlus, Bell } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { TAB_COLORS } from "@/lib/types";
import { FriendsList } from "@/components/social/friends-list";
import { GroupsList } from "@/components/social/groups-list";
import { NotificationsList } from "@/components/social/notifications-list";
import { FindFriends } from "@/components/social/find-friends";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { cn } from "@/lib/utils/cn";

type Modal = "find" | "notifications" | null;
type SubTab = "friends" | "groups";

export default function SocialPage() {
  const [subTab, setSubTab] = useState<SubTab>("friends");
  const [modal, setModal] = useState<Modal>(null);
  const { unreadCount } = useNotifications();

  return (
    <div>
      <PageHeader
        title="Social"
        accentColor={TAB_COLORS.social}
        right={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setModal(modal === "find" ? null : "find")}
              className={cn(
                "p-2 rounded-full transition-colors",
                modal === "find"
                  ? "bg-[var(--color-social-light,#EFF6FF)] text-blue-500"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
              )}
              aria-label="Find friends"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setModal(modal === "notifications" ? null : "notifications")}
              className={cn(
                "relative p-2 rounded-full transition-colors",
                modal === "notifications"
                  ? "bg-[var(--color-social-light,#EFF6FF)] text-blue-500"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
              )}
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--color-error)] text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        }
      />

      {modal === "find" && (
        <div className="mb-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
          <FindFriends />
        </div>
      )}
      {modal === "notifications" && (
        <div className="mb-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
          <NotificationsList />
        </div>
      )}

      <div className="flex border-b border-[var(--color-border)] mb-4">
        {(["friends", "groups"] as SubTab[]).map((tab) => {
          const Icon = tab === "friends" ? UserCheck : Shield;
          const label = tab === "friends" ? "Friends" : "Groups";
          return (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                subTab === tab
                  ? "border-blue-500 text-blue-500"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      {subTab === "friends" && <FriendsList />}
      {subTab === "groups"  && <GroupsList />}
    </div>
  );
}
