import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

// POST /api/records/[id]/complete
// Recurring tasks: toggle completion for today
// One-off tasks: toggle status between 'accepted' and 'completed'
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();

  const { data: rec } = await supabase
    .from("records")
    .select("id, kind, is_recurring, status, user_id, assignee_user_id")
    .eq("id", id)
    .or(`user_id.eq.${session.sub},assignee_user_id.eq.${session.sub}`)
    .single();

  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (rec.kind !== "task") return NextResponse.json({ error: "Lists cannot be completed directly" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const today = (body?.date as string) || new Date().toISOString().split("T")[0];

  if (rec.is_recurring) {
    const { data: existing } = await supabase
      .from("record_completions")
      .select("id")
      .eq("record_id", id)
      .eq("user_id", session.sub)
      .eq("completed_date", today)
      .maybeSingle();

    if (existing) {
      await supabase.from("record_completions").delete().eq("id", existing.id);
      return NextResponse.json({ completed: false });
    } else {
      await supabase.from("record_completions").insert({
        record_id: id,
        user_id: session.sub,
        completed_date: today,
      });
      return NextResponse.json({ completed: true });
    }
  } else {
    const isCompleted = rec.status === "completed";
    const newStatus = isCompleted ? "accepted" : "completed";
    await supabase.from("records").update({ status: newStatus }).eq("id", id);
    return NextResponse.json({ completed: !isCompleted, status: newStatus });
  }
}
