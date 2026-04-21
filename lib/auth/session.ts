import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function getSession(): Promise<{ sub: string; username: string } | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const service = createServiceClient();
    const { data } = await service
      .from("users")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    return { sub: user.id, username: data?.username ?? "" };
  } catch {
    return null;
  }
}