import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// ---- Streak calculation ----
function fmtDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function calcStreaks(activeDays: number[], completionDates: string[]) {
  const set = new Set(completionDates);
  const total = completionDates.length;
  const today = new Date();
  const todayStr = fmtDate(today);
  const completed_today = set.has(todayStr);

  const sorted = [...completionDates].sort();
  const last_completed = sorted.length ? sorted[sorted.length - 1] : null;

  if (!activeDays.length) {
    return { current: 0, longest: 0, total, last_completed, completed_today };
  }

  // Build schedule for last 730 days
  const schedule: string[] = [];
  const d = new Date(today);
  d.setDate(d.getDate() - 730);
  while (d <= today) {
    if (activeDays.includes(d.getDay())) schedule.push(fmtDate(new Date(d)));
    d.setDate(d.getDate() + 1);
  }

  let longest = 0, run = 0;
  for (const date of schedule) {
    if (date === todayStr && !completed_today) continue;
    if (set.has(date)) { run++; if (run > longest) longest = run; }
    else run = 0;
  }

  let current = 0;
  for (let i = schedule.length - 1; i >= 0; i--) {
    const date = schedule[i];
    if (date === todayStr && !completed_today) continue;
    if (set.has(date)) current++;
    else break;
  }

  return { current, longest, total, last_completed, completed_today };
}

// ---- Route handlers ----
const createSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  active_days: z.array(z.number().int().min(0).max(6)),
  priority: z.number().int().min(1).max(5).default(3),
  tag_ids: z.array(z.string().uuid()).default([]),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const withStreaks = request.nextUrl.searchParams.get("streaks") === "true";
  const activeOnly = request.nextUrl.searchParams.get("active") === "true";
  const todayOnly = request.nextUrl.searchParams.get("today") === "true";

  const supabase = await createClient();
  let query = supabase.from("goals").select("*").order("created_at");

  if (activeOnly || todayOnly) query = query.eq("is_active", true);

  const { data: goals, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let filtered = goals ?? [];

  if (todayOnly) {
    const dow = new Date().getDay();
    filtered = filtered.filter((g) => g.active_days?.includes(dow));
  }

  if (!withStreaks) return NextResponse.json({ goals: filtered });

  if (!filtered.length) return NextResponse.json({ goals: [] });

  const since = new Date();
  since.setDate(since.getDate() - 730);

  const { data: completions } = await supabase
    .from("goal_completions")
    .select("goal_id, completed_date")
    .in("goal_id", filtered.map((g) => g.id))
    .gte("completed_date", fmtDate(since));

  const byGoal = new Map<string, string[]>();
  for (const c of completions ?? []) {
    if (!byGoal.has(c.goal_id)) byGoal.set(c.goal_id, []);
    byGoal.get(c.goal_id)!.push(c.completed_date);
  }

  return NextResponse.json({
    goals: filtered.map((g) => ({
      ...g,
      streak: calcStreaks(g.active_days ?? [], byGoal.get(g.id) ?? []),
    })),
  });
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

  const supabase = await createClient();
  const { data: goal, error } = await supabase
    .from("goals")
    .insert({ ...result.data, user_id: session.sub })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goal }, { status: 201 });
}
