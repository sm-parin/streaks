"use client";
import { useState, useRef, useEffect } from "react";
import { Plus, Flame, Activity, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SearchFilterBar, type SortDir } from "@/components/layout/search-filter-bar";
import { RecordFormDialog } from "@/components/records/record-form-dialog";
import { GoalsList } from "@/components/goals/goals-list";
import { ActivitiesList } from "@/components/activities/activities-list";
import { TAB_COLORS } from "@/lib/types";

const GREEN = "#22C55E";

function NewDropdown({ onOpen }: { onOpen: (type: "goal" | "activity") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        size="sm"
        style={{ backgroundColor: GREEN, borderColor: GREEN }}
        onClick={() => setOpen((v) => !v)}
        leftIcon={<Plus className="w-4 h-4" />}
        rightIcon={<ChevronDown className="w-3.5 h-3.5" />}
      >
        New
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-lg overflow-hidden">
          <button
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-[var(--color-bg-secondary)] transition-colors"
            onClick={() => { setOpen(false); onOpen("goal"); }}
          >
            <Flame className="w-4 h-4 text-orange-500" /> Goal
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-[var(--color-bg-secondary)] transition-colors"
            onClick={() => { setOpen(false); onOpen("activity"); }}
          >
            <Activity className="w-4 h-4 text-green-500" /> Activity
          </button>
        </div>
      )}
    </div>
  );
}

export default function RecordsPage() {
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"goal" | "activity">("goal");
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasRecords, setHasRecords] = useState<boolean | null>(null); // null = unknown

  const [search, setSearch] = useState("");
  const [showGoals, setShowGoals] = useState(true);
  const [goalSort, setGoalSort] = useState<SortDir>("asc");
  const [showActivities, setShowActivities] = useState(true);
  const [activitySort, setActivitySort] = useState<SortDir>("asc");

  const openForm = (type: "goal" | "activity") => {
    setFormType(type);
    setShowForm(true);
  };

  const onSaved = () => {
    setShowForm(false);
    setHasRecords(true);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div>
      <PageHeader
        title="Records"
        subtitle="Goals & Activities"
        accentColor={GREEN}
        right={hasRecords ? <NewDropdown onOpen={openForm} /> : undefined}
      />

      {hasRecords !== false && (
        <SearchFilterBar
          search={search} onSearchChange={setSearch}
          showGoals={showGoals} onToggleGoals={() => setShowGoals((v) => !v)}
          goalSort={goalSort} onToggleGoalSort={() => setGoalSort((v) => v === "asc" ? "desc" : "asc")}
          showActivities={showActivities} onToggleActivities={() => setShowActivities((v) => !v)}
          activitySort={activitySort} onToggleActivitySort={() => setActivitySort((v) => v === "asc" ? "desc" : "asc")}
        />
      )}

      {showGoals && (
        <div className="mb-5">
          <GoalsList
            key={`goals-${refreshKey}`}
            onAddNew={() => openForm("goal")}
            search={search}
            sortDir={goalSort}
            onHasData={(v) => setHasRecords((prev) => prev === true ? true : v)}
          />
        </div>
      )}

      {showActivities && (
        <ActivitiesList
          key={`acts-${refreshKey}`}
          onAddNew={() => openForm("activity")}
          search={search}
          sortDir={activitySort}
          onHasData={(v) => setHasRecords((prev) => prev === true ? true : v)}
        />
      )}

      {/* Empty state â€” only show when both lists report no data */}
      {hasRecords === false && !showForm && (
        <div className="flex flex-col items-center gap-5 py-16 text-center">
          <p className="text-[var(--color-text-secondary)] text-sm">No records yet. Add your first one!</p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => openForm("goal")}
              leftIcon={<Flame className="w-4 h-4 text-orange-500" />}
            >
              New Goal
            </Button>
            <Button
              style={{ backgroundColor: GREEN, borderColor: GREEN }}
              onClick={() => openForm("activity")}
              leftIcon={<Activity className="w-4 h-4" />}
            >
              New Activity
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <RecordFormDialog
          type={formType}
          onClose={() => setShowForm(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

