/** Prevent static prerendering ΓÇô content is user-specific */
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StreakList } from "@/components/analytics/streak-list";
import { ReportList } from "@/components/analytics/report-list";

export const metadata: Metadata = {
  title: "Analytics ΓÇô Streaks",
};

/**
 * Analytics page ΓÇô Tab 1 of the app.
 *
 * Sub-tab A: Streak overview ΓÇô one card per active task with current/best streak.
 * Sub-tab B: Daily reports   ΓÇô reverse-chronological completion history.
 */
export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          Analytics
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          Track your habits over time
        </p>
      </div>

      <Tabs defaultValue="streaks">
        <TabsList className="mb-5 w-full">
          <TabsTrigger value="streaks" className="flex-1">
            Streaks
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-1">
            Daily Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="streaks">
          <StreakList />
        </TabsContent>

        <TabsContent value="reports">
          <ReportList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
