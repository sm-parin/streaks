import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { hashValue, verifyValue } from "@/lib/auth/password";

const PASSWORD_RE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]).{8,128}$/;

const updateSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  bio: z.string().max(300).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
});

const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z
    .string()
    .regex(PASSWORD_RE, "Password must be 8-128 chars with uppercase, lowercase, number, and special character"),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, username, nickname, bio, avatar_url, created_at")
    .eq("id", session.sub)
    .single();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const isPasswordChange = url.pathname.endsWith("/password");

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (isPasswordChange) {
    const result = passwordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }
    const supabase = createServiceClient();
    const { data: user } = await supabase
      .from("users")
      .select("password_hash")
      .eq("id", session.sub)
      .single();
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const valid = await verifyValue(result.data.current_password, user.password_hash);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    const newHash = await hashValue(result.data.new_password);
    await supabase
      .from("users")
      .update({ password_hash: newHash, updated_at: new Date().toISOString() })
      .eq("id", session.sub);
    return NextResponse.json({ success: true });
  }

  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: user, error } = await supabase
    .from("users")
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq("id", session.sub)
    .select("id, username, nickname, bio, avatar_url, created_at")
    .single();

  if (error || !user) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ user });
}
