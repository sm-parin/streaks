import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
  is_recurring: z.boolean().optional(),
  active_days: z.array(z.number().int().min(0).max(6)).optional(),
  specific_date: z.string().nullable().optional(),
  time_from: z.string().nullable().optional(),
  time_to: z.string().nullable().optional(),
  list_id: z.string().uuid().nullable().optional(),
  social_mutual: z.array(z.object({ type: z.enum(["user","group"]), id: z.string().uuid() })).optional(),
  status: z.enum(["pending","accepted","completed","rejected"]).optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("id", id)
    .or(`user_id.eq.${session.sub},assignee_user_id.eq.${session.sub},assigner_user_id.eq.${session.sub}`)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (data.kind === "list") {
    const { data: tasks } = await supabase
      .from("records")
      .select("*")
      .eq("list_id", id)
      .order("priority", { ascending: true });
    return NextResponse.json({ record: { ...data, tasks: tasks ?? [] } });
  }

  return NextResponse.json({ record: data });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: record, error } = await supabase
    .from("records")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", session.sub)
    .select()
    .single();

  if (error || !record) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  return NextResponse.json({ record });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();

  const { data: rec } = await supabase.from("records").select("kind").eq("id", id).single();
  if (rec?.kind === "list") {
    await supabase.from("records").update({ list_id: null }).eq("list_id", id);
  }

  const { error } = await supabase
    .from("records")
    .delete()
    .eq("id", id)
    .eq("user_id", session.sub);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const action = body?.action as "accept" | "reject" | undefined;
  if (!action) return NextResponse.json({ error: "action required" }, { status: 400 });

  const supabase = await createClient();
  const newStatus = action === "accept" ? "accepted" : "rejected";

  const { data: record } = await supabase
    .from("records")
    .select("assigner_user_id, title")
    .eq("id", id)
    .eq("user_id", session.sub)
    .single();

  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase.from("records").update({ status: newStatus }).eq("id", id);

  if (record.assigner_user_id && record.assigner_user_id !== session.sub) {
    const admin = createServiceClient();
    await admin.from("notifications").insert({
      user_id: record.assigner_user_id,
      type: action === "accept" ? "task_accepted" : "task_rejected",
      payload: { record_id: id, title: record.title, responder_id: session.sub },
    });
  }

  return NextResponse.json({ success: true, status: newStatus });
}
