import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. BYPASSES RLS.
 *
 * SECURITY:
 *  - This module imports `server-only`, so any accidental client import fails
 *    the build.
 *  - Use exclusively inside audited server-side transaction functions where a
 *    privileged operation is genuinely required.
 *  - The service-role key must never be referenced by client-importable code.
 */
export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
