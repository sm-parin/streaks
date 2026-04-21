import { createClient } from "@/lib/supabase/server";

export async function getSession(): Promise<{ sub: string } | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return { sub: user.id };
  } catch {
    return null;
  }
}