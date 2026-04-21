"use client";
import { useState } from "react";
import { BookPlus, Flame, Activity } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { RecordFormDialog } from "@/components/records/record-form-dialog";
import { GoalsList } from "@/components/goals/goals-list";
import { ActivitiesList } from "@/components/activities/activities-list";
import { TAB_COLORS } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RecordsPage() {
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"goal" | "activity">("goal");
  const [refreshKey, setRefreshKey] = useState(0);

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

      <Tabs defaultValue="goals">
        <TabsList className="mb-4">
          <TabsTrigger value="goals">
            <Flame className="w-3.5 h-3.5 mr-1.5" style={{ color: TAB_COLORS.today }} />
            Goals
          </TabsTrigger>
          <TabsTrigger value="activities">
            <Activity className="w-3.5 h-3.5 mr-1.5" style={{ color: TAB_COLORS.records }} />
            Activities
          </TabsTrigger>
        </TabsList>
        <TabsContent value="goals">
          <GoalsList key={`goals-${refreshKey}`} onAddNew={() => openForm("goal")} />
        </TabsContent>
        <TabsContent value="activities">
          <ActivitiesList key={`acts-${refreshKey}`} onAddNew={() => openForm("activity")} />
        </TabsContent>
      </Tabs>

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
