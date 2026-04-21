import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  nickname: z.string().min(1).max(50),
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

  const { email, password, nickname } = result.data;
  const supabase = createServiceClient();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    const msg = authError.message.includes("already")
      ? "An account with this email already exists"
      : authError.message;
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  const userId = authData.user.id;
  const base = email.split("@")[0].replace(/[^a-z0-9_-]/gi, "").toLowerCase().slice(0, 16);
  const username = `${base}_${Math.random().toString(36).slice(2, 6)}`;

  const { error: profileError } = await supabase.from("users").insert({
    id: userId,
    username,
    nickname,
    password_hash: "",
    sq_name: "",
    sq_place: "",
    sq_animal: "",
    sq_thing: "",
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}