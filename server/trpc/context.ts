import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export async function createTRPCContext(_opts: FetchCreateContextFnOptions) {
  const supabase = await createClient();
  const session = await getSession();
  return { supabase, session };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
