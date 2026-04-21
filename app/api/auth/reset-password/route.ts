import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashValue } from "@/lib/auth/password";
import { verifyToken } from "@/lib/auth/jwt";
import { createServiceClient } from "@/lib/supabase/service";

const PASSWORD_RE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]).{8,128}$/;

const schema = z.object({
  reset_token: z.string().min(1),
  new_password: z
    .string()
    .regex(
      PASSWORD_RE,
      "Password must be 8-128 chars with uppercase, lowercase, number, and special character"
    ),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const { reset_token, new_password } = result.data;
  const payload = await verifyToken(reset_token);

  if (!payload || payload.type !== "password_reset") {
    return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const passwordHash = await hashValue(new_password);

  const { error } = await supabase
    .from("users")
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq("id", payload.sub);

  if (error) {
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
