import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createClient();

  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", session.sub)
    .order("created_at", { ascending: false })
    .limit(50);

  if (unreadOnly) query = query.eq("read", false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unreadCount = (data ?? []).filter((n) => !n.read).length;
  return NextResponse.json({ notifications: data ?? [], unread_count: unreadCount });
}

export async function PATCH() {
  // Mark all as read
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", session.sub)
    .eq("read", false);
  return NextResponse.json({ success: true });
}
