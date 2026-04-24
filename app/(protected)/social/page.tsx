"use client";
import { useState } from "react";
import { UserCheck, Shield, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FriendsList } from "@/components/social/friends-list";
import { GroupsList } from "@/components/social/groups-list";
import { FindFriends } from "@/components/social/find-friends";
import { cn } from "@/lib/utils/cn";

type SubTab = "friends" | "groups";

export default function SocialPage() {
  const [subTab, setSubTab] = useState<SubTab>("friends");
  const [showFind, setShowFind] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader title="Social" accentColor="var(--tab-social)" />
        <button
          onClick={() => setShowFind(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Find Friends
        </button>
      </div>

      <div className="flex gap-1 p-1 bg-[var(--color-bg-secondary)] rounded-xl">
        {([
          { id: "friends" as SubTab, label: "Friends", icon: <UserCheck className="w-4 h-4" /> },
          { id: "groups"  as SubTab, label: "Groups",  icon: <Shield    className="w-4 h-4" /> },
        ]).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all",
              subTab === id
                ? "bg-[var(--color-surface-raised)] text-[var(--tab-social)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {subTab === "friends" ? <FriendsList /> : <GroupsList />}

      {showFind && <FindFriends onClose={() => setShowFind(false)} />}
    </div>
  );
}
