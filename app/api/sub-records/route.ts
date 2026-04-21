import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

const createSchema = z.object({
  goal_id: z.string().uuid().optional().nullable(),
  activity_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(80),
  sort_order: z.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goalId = request.nextUrl.searchParams.get("goal_id");
  const activityId = request.nextUrl.searchParams.get("activity_id");
  const supabase = createServiceClient();

  let query = supabase.from("sub_records").select("*").order("sort_order");
  if (goalId) query = query.eq("goal_id", goalId);
  else if (activityId) query = query.eq("activity_id", activityId);
  else return NextResponse.json({ error: "Provide goal_id or activity_id" }, { status: 400 });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sub_records: data ?? [] });
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

  if (!result.data.goal_id && !result.data.activity_id) {
    return NextResponse.json({ error: "Provide goal_id or activity_id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sub_records")
    .insert(result.data)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sub_record: data }, { status: 201 });
}
