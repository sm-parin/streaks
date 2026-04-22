import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const metaSchema = z.object({
  username: z.string().max(50).optional(),
  bio: z.string().max(200).optional(),
  default_active_days: z.array(z.number().int().min(0).max(6)).optional(),
  timezone: z.string().max(100).optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? "",
      created_at: user.created_at,
      username: typeof meta.username === "string" ? meta.username : undefined,
      bio: typeof meta.bio === "string" ? meta.bio : undefined,
      default_active_days: Array.isArray(meta.default_active_days) ? meta.default_active_days : undefined,
      timezone: typeof meta.timezone === "string" ? meta.timezone : undefined,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Password change request
  if (typeof body === "object" && body !== null && "current_password" in body) {
    const result = passwordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }
    const serviceClient = createServiceClient();
    const { error: signInError } = await serviceClient.auth.signInWithPassword({
      email: user.email!,
      password: result.data.current_password,
    });
    if (signInError) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }
    const { error: updateError } = await supabase.auth.updateUser({
      password: result.data.new_password,
    });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // Metadata update (username, bio, default_active_days, timezone)
  const result = metaSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }
  const { error: updateError } = await supabase.auth.updateUser({
    data: result.data,
  });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
