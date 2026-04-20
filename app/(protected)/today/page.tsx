/** Prevent static prerendering ΓÇô content is user-specific */
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { TodayTaskList } from "@/components/today/today-task-list";

export const metadata: Metadata = {
  title: "Today ΓÇô Streaks",
};

/**
 * Today's Tasks page ΓÇô Tab 2 of the app.
 *
 * Shows all tasks scheduled for the current day of the week.
 * The user can tap a task to mark it complete (or undo completion).
 * Completed tasks move to the bottom of the list.
 */
export default function TodayPage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          Today
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          Tap a task to mark it complete
        </p>
      </div>

      <TodayTaskList />
    </div>
  );
}
