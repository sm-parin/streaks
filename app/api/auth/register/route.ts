import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashValue } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { createServiceClient } from "@/lib/supabase/service";
import { COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth/session";

const PASSWORD_RE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]).{8,128}$/;

const schema = z.object({
  username: z
    .string()
    .regex(
      /^[a-z][a-z0-9_-]{2,19}$/,
      "Username: 3-20 chars, start with a letter, only letters/numbers/_ -"
    ),
  nickname: z.string().min(1).max(50),
  password: z
    .string()
    .regex(
      PASSWORD_RE,
      "Password must be 8-128 chars and include uppercase, lowercase, number, and special character"
    ),
  sq_name: z.string().min(1).max(100),
  sq_place: z.string().min(1).max(100),
  sq_animal: z.string().min(1).max(100),
  sq_thing: z.string().min(1).max(100),
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

  const { username, nickname, password, sq_name, sq_place, sq_animal, sq_thing } =
    result.data;

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
  }

  const [passwordHash, sqName, sqPlace, sqAnimal, sqThing] = await Promise.all([
    hashValue(password),
    hashValue(sq_name.toLowerCase().trim()),
    hashValue(sq_place.toLowerCase().trim()),
    hashValue(sq_animal.toLowerCase().trim()),
    hashValue(sq_thing.toLowerCase().trim()),
  ]);

  const { data: user, error: insertError } = await supabase
    .from("users")
    .insert({
      username,
      nickname,
      password_hash: passwordHash,
      sq_name: sqName,
      sq_place: sqPlace,
      sq_animal: sqAnimal,
      sq_thing: sqThing,
    })
    .select("id, username, nickname, bio, avatar_url, created_at")
    .single();

  if (insertError || !user) {
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }

  const token = await signToken({ sub: user.id, username: user.username });
  const response = NextResponse.json({ user }, { status: 201 });
  response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
  return response;
}
