import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

/** Client for use in Client Components. Only ever sees the public anon
 * key — Row Level Security in Postgres is what actually protects data,
 * not this key being secret. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
