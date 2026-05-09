import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: SECURITY_HEADERS }
    );
  }

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId" },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  // Use service client to bypass RLS — profiles are public
  const db = createServiceClient();
  const { data, error } = await db
    .from("user_stats_cache")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { stats: null, message: "Stats not yet computed" },
      { headers: SECURITY_HEADERS }
    );
  }

  return NextResponse.json({ stats: data }, { headers: SECURITY_HEADERS });
}
