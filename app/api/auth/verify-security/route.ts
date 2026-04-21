import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyValue } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  username: z.string().min(1),
  sq_name: z.string().min(1),
  sq_place: z.string().min(1),
  sq_animal: z.string().min(1),
  sq_thing: z.string().min(1),
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
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const { username, sq_name, sq_place, sq_animal, sq_thing } = result.data;
  const supabase = createServiceClient();

  const { data: user } = await supabase
    .from("users")
    .select("id, username, sq_name, sq_place, sq_animal, sq_thing")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  const FAIL = "Security answers are incorrect";
  if (!user) return NextResponse.json({ error: FAIL }, { status: 401 });

  const [n, p, a, t] = await Promise.all([
    verifyValue(sq_name.toLowerCase().trim(), user.sq_name),
    verifyValue(sq_place.toLowerCase().trim(), user.sq_place),
    verifyValue(sq_animal.toLowerCase().trim(), user.sq_animal),
    verifyValue(sq_thing.toLowerCase().trim(), user.sq_thing),
  ]);

  if (!n || !p || !a || !t) {
    return NextResponse.json({ error: FAIL }, { status: 401 });
  }

  const resetToken = await signToken(
    { sub: user.id, username: user.username, type: "password_reset" },
    "15m"
  );

  return NextResponse.json({ reset_token: resetToken });
}
