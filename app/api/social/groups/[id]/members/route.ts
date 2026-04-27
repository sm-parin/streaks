import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body: { action?: string } = {};
  try { body = await request.json(); } catch { /* ok */ }
  const action = body.action;
  if (action !== "accept" && action !== "decline")
    return NextResponse.json({ error: "action must be accept or decline" }, { status: 400 });
  const supabase = createServiceClient();
  await supabase.from("group_members")
    .update({ status: action === "accept" ? "active" : "removed", ...(action === "accept" ? { joined_at: new Date().toISOString() } : {}) })
    .eq("group_id", id).eq("user_id", session.sub).eq("status", "pending");
  return NextResponse.json({ success: true });
}
