import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let date: string;
  try {
    const body = await request.json();
    date = body.date ?? new Date().toISOString().split("T")[0];
  } catch {
    date = new Date().toISOString().split("T")[0];
  }

  const supabase = await createClient();

  // Verify goal belongs to user
  const { data: goal } = await supabase
    .from("goals")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.sub)
    .single();

  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Toggle: delete if exists, insert if not
  const { data: existing } = await supabase
    .from("goal_completions")
    .select("id")
    .eq("goal_id", id)
    .eq("completed_date", date)
    .maybeSingle();

  if (existing) {
    await supabase.from("goal_completions").delete().eq("id", existing.id);
    return NextResponse.json({ completed: false });
  } else {
    await supabase
      .from("goal_completions")
      .insert({ goal_id: id, user_id: session.sub, completed_date: date });
    return NextResponse.json({ completed: true });
  }
}
