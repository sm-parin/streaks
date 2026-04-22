import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const createSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  activity_date: z.string().optional().nullable(),
  activity_time: z.string().optional().nullable(),
  priority: z.number().int().min(1).max(5).default(3),
  tag_ids: z.array(z.string().uuid()).default([]),
  reminder_minutes: z.array(z.number().int().positive()).optional().nullable(),
  snooze_minutes: z.number().int().min(1).max(1440).optional().nullable(),
  loop_count: z.number().int().min(1).max(99).optional().nullable(),
  assignee_user_id: z.string().uuid().optional().nullable(),
  group_id: z.string().uuid().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const todayOnly = request.nextUrl.searchParams.get("today") === "true";
  const todayStr = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("activities")
    .select("*")
    .not("status", "eq", "rejected")
    .order("created_at", { ascending: false });

  if (todayOnly) query = query.eq("activity_date", todayStr);

  const { data: activities, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activities: activities ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = createSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const data = result.data;
  const assigneeId = data.assignee_user_id ?? session.sub;
  const isSelfAssign = assigneeId === session.sub;

  if (!isSelfAssign && !data.group_id) {
    const supabase = createServiceClient();
    const { data: friendship } = await supabase
      .from("friendships")
      .select("id, auto_accept_activities, status")
      .or(
        `and(requester_id.eq.${session.sub},addressee_id.eq.${assigneeId}),and(requester_id.eq.${assigneeId},addressee_id.eq.${session.sub})`
      )
      .eq("status", "accepted")
      .maybeSingle();

    if (!friendship) {
      return NextResponse.json(
        { error: "You can only assign activities to friends" },
        { status: 403 }
      );
    }
  }

  const supabase = await createClient();
  const status = isSelfAssign || data.group_id ? "accepted" : "pending";

  const { data: activity, error } = await supabase
    .from("activities")
    .insert({
      title: data.title,
      description: data.description,
      activity_date: data.activity_date,
      activity_time: data.activity_time,
      priority: data.priority,
      tag_ids: data.tag_ids,
      reminder_minutes: data.reminder_minutes,
      snooze_minutes: data.snooze_minutes ?? 15,
      loop_count: data.loop_count ?? 1,
      group_id: data.group_id ?? null,
      user_id: session.sub,
      assigner_user_id: session.sub,
      assignee_user_id: data.group_id ? null : assigneeId,
      status,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!isSelfAssign && !data.group_id && activity) {
    // Notification insert needs service role to write to another user's row
    try {
      const admin = createServiceClient();
      await admin.from("notifications").insert({
        user_id: assigneeId,
        type: "activity_assigned",
        payload: {
          activity_id: activity.id,
          activity_title: activity.title,
        },
      });
    } catch { /* non-critical */ }
  }

  return NextResponse.json({ activity }, { status: 201 });
}
