import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cookie-aware server Supabase client for Server Components, Route Handlers,
 * and server-side transactions.
 *
 * SECURITY: Uses the publishable/anon key so that RLS applies. For privileged,
 * audited operations use `createServiceRoleClient` from `./service.ts` inside a
 * server-only module.
 *
 * NOTE: For authorization decisions always call `supabase.auth.getClaims()`,
 * never `getSession()` — see `authenticate()`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component. Safe to ignore because the proxy
            // refreshes the session cookies on every request.
          }
        },
      },
    },
  );
}
