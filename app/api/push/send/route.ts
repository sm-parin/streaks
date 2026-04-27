import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const supabase = createServiceClient();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const todayDOW = today.getDay();

  const { data: subscriptions, error: subErr } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, keys_p256dh, keys_auth");

  if (subErr || !subscriptions?.length) return NextResponse.json({ sent: 0, failed: 0 });

  let sent = 0;
  let failed = 0;
  const toDelete: string[] = [];

  for (const sub of subscriptions) {
    const userId = sub.user_id as string;
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("user_id", userId)
      .eq("is_recurring", true)
      .neq("status", "rejected")
      .contains("active_days", [todayDOW]);

    if (!tasks?.length) continue;

    const { data: completions } = await supabase
      .from("task_completions")
      .select("task_id")
      .eq("user_id", userId)
      .eq("completed_date", todayStr);

    const completedIds = new Set((completions ?? []).map((c) => c.task_id as string));
    const pending = tasks.filter((t) => !completedIds.has(t.id as string));
    if (!pending.length) continue;

    const pushSub = {
      endpoint: sub.endpoint as string,
      keys: { p256dh: sub.keys_p256dh as string, auth: sub.keys_auth as string },
    };

    for (const task of pending) {
      const payload = JSON.stringify({ title: "Streaks", body: task.title as string, url: "/today" });
      try {
        await webpush.sendNotification(pushSub, payload);
        sent++;
      } catch (err: unknown) {
        if ((err as { statusCode?: number }).statusCode === 410) toDelete.push(sub.id as string);
        else console.error("webpush error:", err);
        failed++;
        break;
      }
    }
  }

  if (toDelete.length) await supabase.from("push_subscriptions").delete().in("id", toDelete);
  return NextResponse.json({ sent, failed });
}
