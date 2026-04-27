import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string; userId: string }> };

const patchSchema = z.union([
  z.object({ role: z.enum(["admin", "member"]) }),
  z.object({ action: z.literal("remove") }),
]);

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, userId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  const supabase = createServiceClient();
  const { data: myMembership } = await supabase.from("group_members").select("role")
    .eq("group_id", id).eq("user_id", session.sub).eq("status", "active").maybeSingle();
  if (!myMembership || !["owner", "admin"].includes(myMembership.role as string))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data: group } = await supabase.from("groups").select("created_by").eq("id", id).single();
  if (group?.created_by === userId) return NextResponse.json({ error: "Cannot modify group owner" }, { status: 403 });
  if ("action" in parsed.data) {
    await supabase.from("group_members").update({ status: "removed" }).eq("group_id", id).eq("user_id", userId);
  } else {
    await supabase.from("group_members").update({ role: parsed.data.role }).eq("group_id", id).eq("user_id", userId);
  }
  return NextResponse.json({ success: true });
}
