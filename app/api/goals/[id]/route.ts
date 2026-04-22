import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const updateSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  active_days: z.array(z.number().int().min(0).max(6)).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
  is_active: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  const { data: goal, error: findError } = await supabase
    .from("goals")
    .select("*")
    .eq("id", id)
    .single();
  if (findError || !goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ goal });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: goal, error } = await supabase
    .from("goals")
    .update({ ...result.data })
    .eq("id", id)
    .select()
    .single();

  if (error || !goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ goal });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
