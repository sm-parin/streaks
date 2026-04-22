import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
