"use client";
import { useState } from "react";
import { Flame, Activity } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SearchFilterBar, type SortDir } from "@/components/layout/search-filter-bar";
import { RecordFormDialog } from "@/components/records/record-form-dialog";
import { GoalsList } from "@/components/goals/goals-list";
import { ActivitiesList } from "@/components/activities/activities-list";
import { TAB_COLORS } from "@/lib/types";

export default function RecordsPage() {
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"goal" | "activity">("goal");
  const [refreshKey, setRefreshKey] = useState(0);

  const [search, setSearch] = useState("");
  const [showGoals, setShowGoals] = useState(true);
  const [goalSort, setGoalSort] = useState<SortDir>("asc");
  const [showActivities, setShowActivities] = useState(true);
  const [activitySort, setActivitySort] = useState<SortDir>("asc");

  const openForm = (type: "goal" | "activity") => {
    setFormType(type);
    setShowForm(true);
  };

  return (
    <div>
      <PageHeader
        title="Records"
        subtitle="Goals & Activities"
        accentColor={TAB_COLORS.records}
        right={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openForm("goal")}
              leftIcon={<Flame className="w-4 h-4" style={{ color: TAB_COLORS.today }} />}>
              Goal
            </Button>
            <Button size="sm" onClick={() => openForm("activity")}
              leftIcon={<Activity className="w-4 h-4" />}>
              Activity
            </Button>
          </div>
        }
      />

      <SearchFilterBar
        search={search} onSearchChange={setSearch}
        showGoals={showGoals} onToggleGoals={() => setShowGoals((v) => !v)}
        goalSort={goalSort} onToggleGoalSort={() => setGoalSort((v) => v === "asc" ? "desc" : "asc")}
        showActivities={showActivities} onToggleActivities={() => setShowActivities((v) => !v)}
        activitySort={activitySort} onToggleActivitySort={() => setActivitySort((v) => v === "asc" ? "desc" : "asc")}
      />

      {showGoals && (
        <div className="mb-5">
          <GoalsList key={`goals-${refreshKey}`} onAddNew={() => openForm("goal")}
            search={search} sortDir={goalSort} />
        </div>
      )}

      {showActivities && (
        <ActivitiesList key={`acts-${refreshKey}`} onAddNew={() => openForm("activity")}
          search={search} sortDir={activitySort} />
      )}

      {showForm && (
        <RecordFormDialog
          type={formType}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); setRefreshKey((k) => k + 1); }}
        />
      )}
    </div>
  );
}
