"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SubTabBar } from "@/components/ui/subtab-bar";
import { FriendsList } from "@/components/social/friends-list";
import { GroupsList } from "@/components/social/groups-list";
import { FindFriends } from "@/components/social/find-friends";
import { cn } from "@/lib/utils/cn";

type SubTab = "friends" | "groups";

const TABS: { id: SubTab; label: string }[] = [
  { id: "friends", label: "Friends" },
  { id: "groups",  label: "Groups"  },
];

/**
 * Social page.
 * Has two main subtabs (Friends, Groups) and a full-screen "Find Friends"
 * screen that slides in over the page content when the button is tapped.
 */
export default function SocialPage() {
  const [subTab,   setSubTab]   = useState<SubTab>("friends");
  const [showFind, setShowFind] = useState(false);

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Main content */}
      <div className="px-4 py-5 space-y-0">
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

        {subTab === "friends" ? <FriendsList /> : <GroupsList />}
      </div>

      {/* Find Friends full-screen slide-over */}
      <div
        className={cn(
          "fixed inset-0 bg-[var(--color-bg)] z-50",
          "transition-transform duration-[var(--transition-slow)] ease-out",
          showFind ? "translate-x-0" : "translate-x-full pointer-events-none"
        )}
        aria-hidden={!showFind}
      >
        <FindFriends onBack={() => setShowFind(false)} />
      </div>
    </div>
  );
}
