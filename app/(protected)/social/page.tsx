"use client";

import { useState } from "react";
import { UserPlus, LayoutGrid, Globe } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SubTabBar } from "@/components/ui/subtab-bar";
import { FriendsList } from "@/components/social/friends-list";
import { GroupsList } from "@/components/social/groups-list";
import { FindFriends } from "@/components/social/find-friends";

type View = "primary" | "secondary";
type SubTab = "friends" | "groups";

const TABS: { id: SubTab; label: string }[] = [
  { id: "friends", label: "Friends" },
  { id: "groups",  label: "Groups"  },
];

export default function SocialPage() {
  const [view, setView]     = useState<View>("primary");
  const [subTab, setSubTab] = useState<SubTab>("friends");
  const [showFind, setShowFind] = useState(false);

  if (showFind) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5">
        <FindFriends onBack={() => setShowFind(false)} />
      </div>
    );
  }

  const toggleButton = (
    <button
      onClick={() => setView((v) => v === "primary" ? "secondary" : "primary")}
      className="p-1.5 rounded-lg transition-colors"
      style={{ color: view === "secondary" ? "var(--tab-social)" : "var(--color-text-secondary)" }}
      aria-label={view === "primary" ? "View Global" : "View Social"}
    >
      <LayoutGrid className="w-5 h-5" />
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <PageHeader
        title="Personal"
        accentColor="var(--tab-social)"
        className="mb-4"
        right={toggleButton}
      />

      {view === "secondary" && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Globe className="w-12 h-12 text-[var(--color-text-disabled)]" />
          <p className="text-base font-semibold text-[var(--color-text-primary)]">Global</p>
          <p className="text-sm text-[var(--color-text-secondary)] text-center">
            Discover what the community is working on — coming soon.
          </p>
        </div>
      )}

      {view === "primary" && (
        <>
          <SubTabBar
            tabs={TABS}
            active={subTab}
            onChange={setSubTab}
            accentColor="var(--tab-social)"
            className="mb-5"
          />
          {subTab === "friends"
            ? <FriendsList onFindFriends={() => setShowFind(true)} />
            : <GroupsList />
          }
          <button
            onClick={() => setShowFind(true)}
            className="fixed z-[250] flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg active:scale-95 transition-transform"
            style={{
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
              right: "max(1.25rem, calc((100vw - 42rem) / 2 + 1.25rem))",
              backgroundColor: "var(--tab-social)",
            }}
            aria-label="Find Friends"
          >
            <UserPlus className="w-6 h-6" />
          </button>
        </>
      )}
    </div>
  );
}
