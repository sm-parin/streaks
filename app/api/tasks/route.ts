import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
};

const createTaskSchema = z.object({
  kind: z.literal("task"),
  title: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  priority: z.number().int().min(1).max(5).default(3),
  tag_ids: z.array(z.string().uuid()).default([]),
  is_recurring: z.boolean().default(true),
  active_days: z.array(z.number().int().min(0).max(6)).default([]),
  specific_date: z.string().nullable().optional(),
  time_from: z.string().nullable().optional(),
  time_to: z.string().nullable().optional(),
  list_id: z.string().uuid().nullable().optional(),
  assignee_user_id: z.string().uuid().nullable().optional(),
  group_id: z.string().uuid().nullable().optional(),
  is_global: z.boolean().optional(),
});

const createListSchema = z.object({
  kind: z.literal("list"),
  title: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  priority: z.number().int().min(1).max(5).default(3),
  tag_ids: z.array(z.string().uuid()).default([]),
  task_ids: z.array(z.string().uuid()).optional(),
});

const createSchema = z.discriminatedUnion("kind", [createTaskSchema, createListSchema]);

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: SECURITY_HEADERS });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: SECURITY_HEADERS });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  const supabase = await createClient();

  if (parsed.data.kind === "list") {
    const { task_ids, kind: _kind, ...listFields } = parsed.data;

    const { data: list, error } = await supabase
      .from("lists")
      .insert({ ...listFields, user_id: session.sub })
      .select()
      .single();

    if (error || !list) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create list" },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    if (task_ids?.length) {
      await supabase
        .from("tasks")
        .update({ list_id: list.id })
        .in("id", task_ids)
        .eq("user_id", session.sub);
    }

    return NextResponse.json({ record: list }, { status: 201, headers: SECURITY_HEADERS });
  }

  const data = parsed.data;

  // Enforce single-social constraint (assignee XOR group — not both)
  if (data.assignee_user_id && data.group_id) {
    return NextResponse.json(
      { error: "A task can have either an assignee or a group — not both" },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  const assigneeId = data.assignee_user_id ?? null;
  const isSelf = !assigneeId || assigneeId === session.sub;

  if (!isSelf && !data.group_id) {
    // Service client required to read another user'\''s friendships (cross-user read)
    const admin = createServiceClient();
    const { data: friendship } = await admin
      .from("friendships")
      .select("id, status")
      .or(
        `and(requester_id.eq.${session.sub},addressee_id.eq.${assigneeId}),` +
        `and(requester_id.eq.${assigneeId},addressee_id.eq.${session.sub})`
      )
      .eq("status", "accepted")
      .maybeSingle();

    if (!friendship) {
      return NextResponse.json(
        { error: "Can only assign tasks to friends" },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }
  }

  const status = isSelf || data.group_id ? "accepted" : "pending";
  const taskUserId = isSelf ? session.sub : (assigneeId as string);

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      user_id: taskUserId,
      title: data.title,
      description: data.description ?? null,
      priority: data.priority,
      tag_ids: data.tag_ids,
      status,
      is_recurring: data.is_recurring,
      active_days: data.active_days,
      specific_date: data.is_recurring ? null : (data.specific_date ?? null),
      time_from: data.time_from ?? null,
      time_to: data.time_to ?? null,
      list_id: data.list_id ?? null,
      assigner_user_id: session.sub,
      assignee_user_id: assigneeId,
      group_id: data.group_id ?? null,
      allow_grace: true,
      is_global: data.is_global ?? (!data.is_recurring && !data.specific_date),
    })
    .select()
    .single();

  if (error || !task) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create task" },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }

  if (!isSelf && assigneeId) {
    // Service client required to write to another user'\''s notifications row
    const admin = createServiceClient();
    await admin.from("notifications").insert({
      user_id: assigneeId,
      type: "task_assigned",
      payload: { task_id: task.id, title: task.title, assigner_id: session.sub },
    });
  }

  return NextResponse.json({ record: task }, { status: 201, headers: SECURITY_HEADERS });
}
