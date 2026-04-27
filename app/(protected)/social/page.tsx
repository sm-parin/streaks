"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SubTabBar } from "@/components/ui/subtab-bar";
import { FriendsList } from "@/components/social/friends-list";
import { GroupsList } from "@/components/social/groups-list";
import { FindFriends } from "@/components/social/find-friends";

type SubTab = "friends" | "groups";

const TABS: { id: SubTab; label: string }[] = [
  { id: "friends", label: "Friends" },
  { id: "groups",  label: "Groups"  },
];

export default function SocialPage() {
  const [subTab,   setSubTab]   = useState<SubTab>("friends");
  const [showFind, setShowFind] = useState(false);

  if (showFind) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5">
        <FindFriends onBack={() => setShowFind(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="Social" className="mb-0" accentColor="var(--tab-social)" />
        <button
          onClick={() => setShowFind(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--tab-social)] hover:underline transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Find Friends
        </button>
      </div>

      <SubTabBar
        tabs={TABS}
        active={subTab}
        onChange={setSubTab}
        accentColor="var(--tab-social)"
        className="mb-5"
      />

      {subTab === "friends" ? <FriendsList onFindFriends={() => setShowFind(true)} /> : <GroupsList />}
    </div>
  );
}
