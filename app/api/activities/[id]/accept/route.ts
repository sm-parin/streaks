import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ action: z.enum(["accept", "reject"]) });

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "action must be 'accept' or 'reject'" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const newStatus = result.data.action === "accept" ? "accepted" : "rejected";

  const { data: activity, error } = await supabase
    .from("activities")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("assignee_user_id", session.sub)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !activity) {
    return NextResponse.json({ error: "Activity not found or already actioned" }, { status: 404 });
  }

  const notifType =
    result.data.action === "accept" ? "activity_accepted" : "activity_rejected";
  await supabase.from("notifications").insert({
    user_id: activity.creator_user_id,
    type: notifType,
    data: {
      activity_id: activity.id,
      activity_title: activity.title,
    },
  });

  return NextResponse.json({ activity });
}
