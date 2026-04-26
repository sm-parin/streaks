import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// GET /api/today — returns tasks for today + today's completion records
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const todayDOW = new Date().getDay();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .or(`user_id.eq.${session.sub},assignee_user_id.eq.${session.sub}`)
    .in("status", ["accepted", "completed"])
    .or(
      `and(is_recurring.eq.true,active_days.cs.{${todayDOW}}),` +
      `and(is_recurring.eq.false,specific_date.lte.${today},status.neq.completed)`
    )
    .order("priority", { ascending: true })
    .order("time_from", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = tasks ?? [];

  // Fetch today's completions for recurring tasks
  const recurringIds = rows.filter((t) => t.is_recurring).map((t) => t.id as string);
  let completedIds: string[] = [];
  if (recurringIds.length) {
    const { data: comps } = await supabase
      .from("task_completions")
      .select("task_id")
      .in("task_id", recurringIds)
      .eq("user_id", session.sub)
      .eq("completed_date", today);
    completedIds = (comps ?? []).map((c) => c.task_id as string);
  }

  // Fetch parent lists so the client can group tasks
  const listIds = [...new Set(rows.filter((t) => t.list_id).map((t) => t.list_id as string))];
  let lists: Record<string, unknown>[] = [];
  if (listIds.length) {
    const { data: listData } = await supabase
      .from("lists")
      .select("*")
      .in("id", listIds);
    lists = listData ?? [];
  }

  return NextResponse.json({ tasks: rows, completedIds, lists });
}
