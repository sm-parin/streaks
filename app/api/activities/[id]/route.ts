import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  activity_date: z.string().nullable().optional(),
  activity_time: z.string().nullable().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
  reminder_minutes: z.array(z.number().int().positive()).nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: activity, error } = await supabase
    .from("activities")
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .or(`creator_user_id.eq.${session.sub},assignee_user_id.eq.${session.sub}`)
    .select()
    .single();

  if (error || !activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ activity });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", id)
    .eq("creator_user_id", session.sub);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest, { params }: Params) {
  // Toggle complete
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("activity_completions")
    .select("id")
    .eq("activity_id", id)
    .eq("user_id", session.sub)
    .maybeSingle();

  if (existing) {
    await supabase.from("activity_completions").delete().eq("id", existing.id);
    await supabase
      .from("activities")
      .update({ status: "accepted" })
      .eq("id", id);
    return NextResponse.json({ completed: false });
  } else {
    await supabase
      .from("activity_completions")
      .insert({ activity_id: id, user_id: session.sub });
    await supabase
      .from("activities")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({ completed: true });
  }
}
