import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";

const createSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(300).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, role, status")
    .eq("user_id", session.sub)
    .in("status", ["active", "pending"]);

  if (!memberships?.length) return NextResponse.json({ groups: [] });

  const groupIds = memberships.map((m) => m.group_id);
  const { data: groups } = await supabase
    .from("groups")
    .select("*, member_count:group_members(count)")
    .in("id", groupIds);

  const enriched = (groups ?? []).map((g) => {
    const m = memberships.find((m) => m.group_id === g.id);
    return { ...g, my_role: m?.role, my_status: m?.status };
  });

  return NextResponse.json({ groups: enriched });
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
  const { data: group, error } = await supabase
    .from("groups")
    .insert({ ...result.data, created_by: session.sub })
    .select()
    .single();

  if (error || !group) return NextResponse.json({ error: error?.message }, { status: 500 });

  await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: session.sub,
    role: "admin",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  return NextResponse.json({ group }, { status: 201 });
}
