import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
};

type Params = { params: Promise<{ id: string }> };

// POST /api/tasks/[id]/complete
// Recurring tasks: toggle completion for today (inserts/deletes task_completions row)
// One-off tasks:   toggle status between 'accepted' and 'completed'
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: SECURITY_HEADERS });
  }
  const { id } = await params;
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, is_recurring, status, user_id, assignee_user_id")
    .eq("id", id)
    .or(`user_id.eq.${session.sub},assignee_user_id.eq.${session.sub}`)
    .single();

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: SECURITY_HEADERS });
  }

  const body = await request.json().catch(() => ({})) as { date?: string };
  const today = body?.date ?? new Date().toISOString().split("T")[0];

  if (task.is_recurring) {
    const { data: existing } = await supabase
      .from("task_completions")
      .select("id")
      .eq("task_id", id)
      .eq("user_id", session.sub)
      .eq("completed_date", today)
      .maybeSingle();

    if (existing) {
      await supabase.from("task_completions").delete().eq("id", existing.id);
      return NextResponse.json({ completed: false }, { headers: SECURITY_HEADERS });
    }

    await supabase.from("task_completions").insert({
      task_id: id,
      user_id: session.sub,
      completed_date: today,
      is_grace: false,
    });
    return NextResponse.json({ completed: true }, { headers: SECURITY_HEADERS });
  }

  // One-off task — toggle status
  const isCompleted = task.status === "completed";
  const newStatus = isCompleted ? "accepted" : "completed";
  await supabase.from("tasks").update({ status: newStatus }).eq("id", id);
  return NextResponse.json({ completed: !isCompleted, status: newStatus }, { headers: SECURITY_HEADERS });
}
