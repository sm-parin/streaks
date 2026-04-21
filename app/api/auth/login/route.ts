import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyValue } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { createServiceClient } from "@/lib/supabase/service";
import { COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth/session";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
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
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, username, nickname, bio, avatar_url, password_hash, created_at")
    .eq("username", result.data.username.toLowerCase())
    .maybeSingle();

  const INVALID = "Invalid username or password";
  if (!user) return NextResponse.json({ error: INVALID }, { status: 401 });

  const valid = await verifyValue(result.data.password, user.password_hash);
  if (!valid) return NextResponse.json({ error: INVALID }, { status: 401 });

  const { password_hash: _ph, ...safeUser } = user;
  const token = await signToken({ sub: user.id, username: user.username });
  const response = NextResponse.json({ user: safeUser });
  response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
  return response;
}
