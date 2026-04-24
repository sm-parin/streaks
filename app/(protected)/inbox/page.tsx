export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { InboxList } from "@/components/inbox/inbox-list";

export const metadata: Metadata = {
  title: "Inbox — Streaks",
};

export default function InboxPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <InboxList />
    </div>
  );
}
