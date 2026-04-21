import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
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
    return NextResponse.json(
      { error: result.error.errors[0].message },
      { status: 400 }
    );
  }

  const { email, password } = result.data;
  const supabase = createServiceClient();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    const msg =
      authError.message.toLowerCase().includes("already") ||
      authError.message.toLowerCase().includes("email")
        ? "An account with this email already exists"
        : authError.message;
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  const userId = authData.user.id;
  // profiles row is auto-created by the on_auth_user_created trigger;
  // nothing more to insert.
  void userId;

  return NextResponse.json({ success: true });
}