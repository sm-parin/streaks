/** Prevent static prerendering ΓÇô content is user-specific */
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ConfigureTaskList } from "@/components/configure/configure-task-list";

export const metadata: Metadata = {
  title: "Configure ΓÇô Streaks",
};

/**
 * Configure Tasks page ΓÇô Tab 3 of the app.
 *
 * Allows the user to create, edit, pause, and delete tasks.
 * Each task has a name, optional description, a set of scheduled days,
 * and a colour indicator.
 */
export default function ConfigurePage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          Configure
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          Manage your habits and their schedules
        </p>
      </div>

      <ConfigureTaskList />
    </div>
  );
}
