import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  activity_date: z.string().nullable().optional(),
  activity_time: z.string().nullable().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
  reminder_minutes: z.array(z.number().int().positive()).nullable().optional(),
  /** Pass toggle_complete: true to flip the completed status */
  toggle_complete: z.boolean().optional(),
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

  const supabase = await createClient();
  const { toggle_complete, ...fields } = result.data;

  if (toggle_complete) {
    // Read current status and flip it
    const { data: current } = await supabase
      .from("activities")
      .select("id, status")
      .eq("id", id)
      .single();
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const newStatus = current.status === "completed" ? "accepted" : "completed";
    await supabase.from("activities").update({ status: newStatus }).eq("id", id);
    return NextResponse.json({ completed: newStatus === "completed" });
  }

  // Regular field update
  const { data: activity, error } = await supabase
    .from("activities")
    .update({ ...fields })
    .eq("id", id)
    .select()
    .single();

  if (error || !activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ activity });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
