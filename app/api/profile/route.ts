import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    user: { id: user.id, email: user.email ?? "", created_at: user.created_at },
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

  const result = passwordSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  // Verify current password via re-authentication (service client, session not persisted)
  const serviceClient = createServiceClient();
  const { error: signInError } = await serviceClient.auth.signInWithPassword({
    email: user.email!,
    password: result.data.current_password,
  });
  if (signInError) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  // Update password using the session-aware SSR client
  const { error: updateError } = await supabase.auth.updateUser({
    password: result.data.new_password,
  });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
