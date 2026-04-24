import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// ── Validation schemas ──────────────────────────────────────────────────────

const createTaskSchema = z.object({
  kind: z.literal("task"),
  title: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  priority: z.number().int().min(1).max(5).default(3),
  tag_ids: z.array(z.string().uuid()).default([]),
  is_recurring: z.boolean().default(false),
  active_days: z.array(z.number().int().min(0).max(6)).default([]),
  specific_date: z.string().nullable().optional(),
  time_from: z.string().nullable().optional(),
  time_to: z.string().nullable().optional(),
  list_id: z.string().uuid().nullable().optional(),
  assignee_user_id: z.string().uuid().nullable().optional(),
  group_id: z.string().uuid().nullable().optional(),
});

const createListSchema = z.object({
  kind: z.literal("list"),
  title: z.string().min(1).max(120),
  social_mutual: z.array(z.object({
    type: z.enum(["user", "group"]),
    id: z.string().uuid(),
  })).default([]),
  task_ids: z.array(z.string().uuid()).optional(),
});

const createSchema = z.discriminatedUnion("kind", [createTaskSchema, createListSchema]);

// ── GET /api/records ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const forToday = searchParams.get("today") === "true";

  if (forToday) {
    const today = new Date().toISOString().split("T")[0];
    const todayDOW = new Date().getDay();

    const { data, error } = await supabase
      .from("records")
      .select("*")
      .eq("kind", "task")
      .or(`user_id.eq.${session.sub},assignee_user_id.eq.${session.sub}`)
      .in("status", ["accepted", "completed"])
      .or(
        `and(is_recurring.eq.true,active_days.cs.{${todayDOW}}),` +
        `and(is_recurring.eq.false,specific_date.lte.${today},status.neq.completed)`
      )
      .order("priority", { ascending: true })
      .order("specific_date", { ascending: true, nullsFirst: false })
      .order("time_from", { ascending: true, nullsFirst: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ records: data ?? [] });
  }

  // Full records list (for Records tab)
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .or(`user_id.eq.${session.sub},assignee_user_id.eq.${session.sub},assigner_user_id.eq.${session.sub}`)
    .not("status", "eq", "rejected")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const lists = rows.filter((r) => r.kind === "list");
  const tasks = rows.filter((r) => r.kind === "task");

  const listsWithTasks = lists.map((l) => ({
    ...l,
    tasks: tasks.filter((t) => t.list_id === l.id),
  }));
  const listIds = new Set(lists.map((l) => l.id));
  const standaloneTasks = tasks.filter((t) => !t.list_id || !listIds.has(t.list_id));

  const result = [
    ...listsWithTasks,
    ...standaloneTasks,
  ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return NextResponse.json({ records: result });
}

// ── POST /api/records ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const supabase = await createClient();

  if (parsed.data.kind === "list") {
    const { task_ids, ...listData } = parsed.data;

    const { data: list, error } = await supabase
      .from("records")
      .insert({
        kind: "list",
        user_id: session.sub,
        title: listData.title,
        social_mutual: listData.social_mutual,
        priority: 3,
        tag_ids: [],
        status: "accepted",
        is_recurring: false,
        active_days: [],
      })
      .select()
      .single();

    if (error || !list) return NextResponse.json({ error: error?.message }, { status: 500 });

    if (task_ids?.length) {
      await supabase
        .from("records")
        .update({ list_id: list.id })
        .in("id", task_ids)
        .eq("user_id", session.sub)
        .eq("kind", "task");
    }

    return NextResponse.json({ record: list }, { status: 201 });
  }

  // kind === 'task'
  const data = parsed.data;
  const assigneeId = data.assignee_user_id ?? null;
  const isSelf = !assigneeId || assigneeId === session.sub;

  if (!isSelf && !data.group_id) {
    const admin = createServiceClient();
    const { data: friendship } = await admin
      .from("friendships")
      .select("id, status")
      .or(`and(requester_id.eq.${session.sub},addressee_id.eq.${assigneeId}),and(requester_id.eq.${assigneeId},addressee_id.eq.${session.sub})`)
      .eq("status", "accepted")
      .maybeSingle();

    if (!friendship) {
      return NextResponse.json({ error: "Can only assign to friends" }, { status: 403 });
    }
  }

  const status = isSelf || data.group_id ? "accepted" : "pending";

  const { data: record, error } = await supabase
    .from("records")
    .insert({
      kind: "task",
      user_id: isSelf ? session.sub : assigneeId,
      title: data.title,
      description: data.description ?? null,
      priority: data.priority,
      tag_ids: data.tag_ids,
      status,
      is_recurring: data.is_recurring,
      active_days: data.active_days,
      specific_date: data.specific_date ?? null,
      time_from: data.time_from ?? null,
      time_to: data.time_to ?? null,
      list_id: data.list_id ?? null,
      assigner_user_id: session.sub,
      assignee_user_id: assigneeId,
      group_id: data.group_id ?? null,
      social_mutual: [],
    })
    .select()
    .single();

  if (error || !record) return NextResponse.json({ error: error?.message }, { status: 500 });

  if (!isSelf && assigneeId) {
    const admin = createServiceClient();
    await admin.from("notifications").insert({
      user_id: assigneeId,
      type: "task_assigned",
      payload: { record_id: record.id, title: record.title, assigner_id: session.sub },
    });
  }

  return NextResponse.json({ record }, { status: 201 });
}
