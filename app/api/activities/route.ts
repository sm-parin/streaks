import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

const createSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  activity_date: z.string().optional().nullable(),
  activity_time: z.string().optional().nullable(),
  priority: z.number().int().min(1).max(5).default(3),
  tag_ids: z.array(z.string().uuid()).default([]),
  reminder_minutes: z.array(z.number().int().positive()).optional().nullable(),
  assignee_user_id: z.string().uuid().optional().nullable(),
  group_id: z.string().uuid().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const todayOnly = request.nextUrl.searchParams.get("today") === "true";
  const todayStr = new Date().toISOString().split("T")[0];

  // Activities assigned to me (individual) 
  let q1 = supabase
    .from("activities")
    .select("*, creator:creator_user_id(username,nickname)")
    .eq("assignee_user_id", session.sub)
    .not("status", "eq", "rejected");

  if (todayOnly) q1 = q1.eq("activity_date", todayStr);

  const { data: myActivities } = await q1;

  // Group activities for my active groups
  const { data: myGroups } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", session.sub)
    .eq("status", "active");

  let groupActivities: unknown[] = [];
  if (myGroups && myGroups.length > 0) {
    const groupIds = myGroups.map((g) => g.group_id);
    let q2 = supabase
      .from("activities")
      .select("*, creator:creator_user_id(username,nickname), grp:group_id(name)")
      .in("group_id", groupIds)
      .is("assignee_user_id", null);

    if (todayOnly) q2 = q2.eq("activity_date", todayStr);
    const { data } = await q2;
    groupActivities = data ?? [];
  }

  const activities = [...(myActivities ?? []), ...groupActivities];
  return NextResponse.json({ activities });
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
  // If no assignee specified, assign to self
  const assigneeId = data.assignee_user_id ?? session.sub;
  const isSelfAssign = assigneeId === session.sub;

  // Check if assigning to a friend
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

  const supabase = createServiceClient();
  // Self-assigned or group activities are auto-accepted
  const status = isSelfAssign || data.group_id ? "accepted" : "pending";

  const { data: activity, error } = await supabase
    .from("activities")
    .insert({
      ...data,
      assignee_user_id: data.group_id ? null : assigneeId,
      creator_user_id: session.sub,
      status,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create notification for recipient (if not self-assigned)
  if (!isSelfAssign && !data.group_id && activity) {
    await supabase.from("notifications").insert({
      user_id: assigneeId,
      type: "activity_assigned",
      data: {
        activity_id: activity.id,
        activity_title: activity.title,
        from_username: session.username,
      },
    });
  }

  return NextResponse.json({ activity }, { status: 201 });
}
