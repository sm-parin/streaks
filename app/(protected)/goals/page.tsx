"use client";

import React, { useState } from "react";
import { Plus, LayoutGrid } from "lucide-react";
import { TodayList } from "@/components/today/today-list";
import { HabitsView } from "@/components/habits/habits-view";
import { RCM } from "@/components/records/rcm";

type View = "primary" | "secondary";

export default function GoalsPage() {
  const [view, setView] = useState<View>("primary");
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const toggleButton = (
    <button
      onClick={() => setView((v) => v === "primary" ? "secondary" : "primary")}
      className="p-1.5 rounded-lg transition-colors"
      style={{ color: view === "secondary" ? "var(--tab-goals)" : "var(--color-text-secondary)" }}
      aria-label={view === "primary" ? "View Habits" : "View Today"}
    >
      <LayoutGrid className="w-5 h-5" />
    </button>
  );

  return (
    <>
      {view === "primary" ? (
        <TodayList
          right={toggleButton}
          onAddHabit={() => setView("secondary")}
        />
      ) : (
        <HabitsView
          headerRight={toggleButton}
          refreshTrigger={refreshTrigger}
        />
      )}

      <button
        onClick={() => setCreateOpen(true)}
        className="fixed z-[250] flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg active:scale-95 transition-transform"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
          right: "max(1.25rem, calc((100vw - 42rem) / 2 + 1.25rem))",
          backgroundColor: "var(--tab-goals)",
        }}
        aria-label="Add habit"
      >
        <Plus className="w-6 h-6" />
      </button>

      {createOpen && (
        <RCM
          open
          mode="create"
          initialKind="task"
          onClose={() => setCreateOpen(false)}
          onSave={() => {
            setCreateOpen(false);
            setRefreshTrigger((t) => t + 1);
          }}
        />
      )}
    </>
  );
}
