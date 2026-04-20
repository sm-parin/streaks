import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client suitable for use in Client Components.
 * Manages the auth session via browser cookies automatically.
 *
 * Call this inside components or hooks ΓÇô do NOT call it at module scope
 * so the environment variables are always resolved at runtime.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
