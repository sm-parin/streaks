import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
};

type Params = { params: Promise<{ id: string }> };

const updateTaskSchema = z.object({
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
  status: z.enum(["pending", "accepted", "completed", "rejected"]).optional(),
  allow_grace: z.boolean().optional(),
  is_disabled: z.boolean().optional(),
});

const updateListSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: SECURITY_HEADERS });
  }
  const { id } = await params;
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .or(`user_id.eq.${session.sub},assignee_user_id.eq.${session.sub},assigner_user_id.eq.${session.sub}`)
    .maybeSingle();

  if (task) {
    return NextResponse.json({ record: task }, { headers: SECURITY_HEADERS });
  }

  const { data: list } = await supabase
    .from("lists")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.sub)
    .maybeSingle();

  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: SECURITY_HEADERS });
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("list_id", id)
    .order("priority", { ascending: true });

  return NextResponse.json(
    { record: { ...list, tasks: tasks ?? [] } },
    { headers: SECURITY_HEADERS }
  );
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: SECURITY_HEADERS });
  }
  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: SECURITY_HEADERS });
  }

  const supabase = await createClient();

  const { data: isTask } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.sub)
    .maybeSingle();

  if (isTask) {
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    const { data: record, error } = await supabase
      .from("tasks")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", session.sub)
      .select()
      .single();

    if (error || !record) {
      return NextResponse.json(
        { error: "Not found or unauthorized" },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }
    return NextResponse.json({ record }, { headers: SECURITY_HEADERS });
  }

  const parsed = updateListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }
  const { data: record, error } = await supabase
    .from("lists")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", session.sub)
    .select()
    .single();

  if (error || !record) {
    return NextResponse.json(
      { error: "Not found or unauthorized" },
      { status: 404, headers: SECURITY_HEADERS }
    );
  }
  return NextResponse.json({ record }, { headers: SECURITY_HEADERS });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: SECURITY_HEADERS });
  }
  const { id } = await params;
  const supabase = await createClient();

  const { data: list } = await supabase
    .from("lists")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.sub)
    .maybeSingle();

  if (list) {
    await supabase.from("tasks").update({ list_id: null }).eq("list_id", id);
    const { error } = await supabase.from("lists").delete().eq("id", id).eq("user_id", session.sub);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: SECURITY_HEADERS });
    }
    return NextResponse.json({ success: true }, { headers: SECURITY_HEADERS });
  }

  // Check for completion history before deleting
  const { count } = await supabase
    .from("task_completions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", id);
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { action: "suggest_disable", message: "This habit has history and cannot be deleted. Disable it instead to keep your data." },
      { headers: SECURITY_HEADERS }
    );
  }

  const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", session.sub);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: SECURITY_HEADERS });
  }
  return NextResponse.json({ success: true }, { headers: SECURITY_HEADERS });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: SECURITY_HEADERS });
  }
  const { id } = await params;

  const body = await request.json().catch(() => ({})) as { action?: string };
  const action = body?.action as "accept" | "reject" | undefined;
  if (action !== "accept" && action !== "reject") {
    return NextResponse.json(
      { error: "action must be '\''accept'\'' or '\''reject'\''" },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("assigner_user_id, title")
    .eq("id", id)
    .eq("user_id", session.sub)
    .single();

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: SECURITY_HEADERS });
  }

  const newStatus = action === "accept" ? "accepted" : "rejected";
  await supabase.from("tasks").update({ status: newStatus }).eq("id", id);

  if (task.assigner_user_id && task.assigner_user_id !== session.sub) {
    // Service client required to write to another user'\''s notifications row
    const admin = createServiceClient();
    await admin.from("notifications").insert({
      user_id: task.assigner_user_id,
      type: action === "accept" ? "task_accepted" : "task_rejected",
      payload: { task_id: id, title: task.title, responder_id: session.sub },
    });
  }

  return NextResponse.json({ success: true, status: newStatus }, { headers: SECURITY_HEADERS });
}
