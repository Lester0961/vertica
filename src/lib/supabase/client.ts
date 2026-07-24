import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client.
 *
 * SECURITY: Uses ONLY the public URL and publishable/anon key. This module is
 * client-importable, so it MUST NEVER reference the service-role key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
