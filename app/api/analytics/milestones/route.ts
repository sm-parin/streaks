import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
};

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

function getDOW(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay();
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: SECURITY_HEADERS });
  }

  const { searchParams } = new URL(request.url);
  const mode  = searchParams.get("mode")  ?? "Today";
  const day   = Number(searchParams.get("day")   ?? new Date().getDate());
  const month = Number(searchParams.get("month") ?? (new Date().getMonth() + 1));
  const year  = Number(searchParams.get("year")  ?? new Date().getFullYear());

  const userId = session.sub;
  const supabase = await createClient();

  // ── Today / Daily ──────────────────────────────────────────────────────────
  if (mode === "Today" || mode === "Daily") {
    const date = mode === "Today"
      ? new Date().toISOString().split("T")[0]
      : isoDate(year, month, day);

    const dow = getDOW(date);

    const { data: taskRows } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("is_global", false)
      .eq("is_disabled", false)
      .not("status", "eq", "rejected")
      .or(
        `and(is_recurring.eq.true,active_days.cs.{${dow}}),` +
        `and(is_recurring.eq.false,specific_date.eq.${date})`
      );

    const tasks = taskRows ?? [];
    const taskIds = tasks.map((t: { id: string }) => t.id);

    let completedTaskIds: string[] = [];
    if (taskIds.length > 0) {
      const { data: comps } = await supabase
        .from("task_completions")
        .select("task_id")
        .in("task_id", taskIds)
        .eq("user_id", userId)
        .eq("completed_date", date);
      completedTaskIds = (comps ?? []).map((c: { task_id: string }) => c.task_id);
    }

    return NextResponse.json({ tasks, completedTaskIds }, { headers: SECURITY_HEADERS });
  }

  // ── Helper: get all recurring task ids + active_days for rate calculations ──
  const { data: recurringTasks } = await supabase
    .from("tasks")
    .select("id, active_days")
    .eq("user_id", userId)
    .eq("is_recurring", true)
    .eq("is_global", false)
    .eq("is_disabled", false)
    .not("status", "eq", "rejected");

  const rTasks = (recurringTasks ?? []) as Array<{ id: string; active_days: number[] }>;

  async function rateForDate(dateStr: string): Promise<number> {
    const dow = getDOW(dateStr);
    const scheduled = rTasks.filter((t) => t.active_days.includes(dow));
    if (scheduled.length === 0) return 0;
    const ids = scheduled.map((t) => t.id);
    const { count } = await supabase
      .from("task_completions")
      .select("id", { count: "exact", head: true })
      .in("task_id", ids)
      .eq("user_id", userId)
      .eq("completed_date", dateStr);
    return (count ?? 0) / scheduled.length;
  }

  // ── Weekly ─────────────────────────────────────────────────────────────────
  if (mode === "Weekly") {
    // Week containing the given date (Mon–Sun)
    const refDate = isoDate(year, month, day);
    const refDOW = getDOW(refDate); // 0=Sun
    const weekStart = addDays(refDate, -(refDOW === 0 ? 6 : refDOW - 1)); // Mon

    const points: { label: string; value: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const rate = await rateForDate(d);
      const label = new Date(d + "T00:00:00Z").toLocaleDateString(undefined, { weekday: "short" });
      points.push({ label, value: rate });
    }
    const weekEnd = addDays(weekStart, 6);
    return NextResponse.json({ points, label: `${weekStart} – ${weekEnd}` }, { headers: SECURITY_HEADERS });
  }

  // ── Monthly ────────────────────────────────────────────────────────────────
  if (mode === "Monthly") {
    const totalDays = daysInMonth(month, year);
    const today = new Date().toISOString().split("T")[0];
    const points: { label: string; value: number }[] = [];
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = isoDate(year, month, d);
      if (dateStr > today) break; // don't show future
      const rate = await rateForDate(dateStr);
      points.push({ label: String(d), value: rate });
    }
    const label = `${MONTH_LABELS[month - 1]} ${year}`;
    return NextResponse.json({ points, label }, { headers: SECURITY_HEADERS });
  }

  // ── Yearly ─────────────────────────────────────────────────────────────────
  if (mode === "Yearly") {
    const today = new Date().toISOString().split("T")[0];
    const points: { label: string; value: number }[] = [];

    for (let m = 1; m <= 12; m++) {
      const totalDays = daysInMonth(m, year);
      let sum = 0; let count = 0;
      for (let d = 1; d <= totalDays; d++) {
        const dateStr = isoDate(year, m, d);
        if (dateStr > today) break;
        const rate = await rateForDate(dateStr);
        sum += rate;
        count++;
      }
      if (count === 0) break; // future month
      points.push({ label: MONTH_LABELS[m - 1], value: sum / count });
    }

    return NextResponse.json({ points, label: String(year) }, { headers: SECURITY_HEADERS });
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400, headers: SECURITY_HEADERS });
}
