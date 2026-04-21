import { createClient } from "@supabase/supabase-js";

/** Service-role Supabase client. Server-side only ╬ô├ç├╢ bypasses RLS. */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
