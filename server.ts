import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types";

/** Server-side client bound to the current request's cookies. Use this
 * in Server Components, Route Handlers and Server Actions so every
 * query runs as the actual signed-in user and respects RLS. */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component with no response to write to —
            // safe to ignore because middleware refreshes the session too.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // see note above
          }
        },
      },
    }
  );
}

/** Elevated client for trusted server-only operations (e.g. writing
 * AI-generated content that isn't tied to a single request's cookies).
 * NEVER import this in anything that runs in the browser. */
export function createServiceClient() {
  const { createClient: createRawClient } = require("@supabase/supabase-js");
  return createRawClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
