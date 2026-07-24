import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session-refresh logic for the Next.js 16 Proxy boundary.
 *
 * Responsibilities:
 *  - Refresh Supabase auth cookies on every matched request.
 *  - Validate identity via `getClaims()` (validates the JWT signature locally
 *    against the project's public keys) rather than `getSession()`, which reads
 *    raw, spoofable cookie storage without revalidation.
 *  - Perform an optimistic redirect for unauthenticated users hitting a
 *    protected area. Real authorization still happens per-route/per-API via
 *    `authenticate()`.
 */

// Public route prefixes that never require an authenticated session.
const PUBLIC_PREFIXES = [
  "/",
  "/explore",
  "/available-units",
  "/units",
  "/compare",
  "/recommend",
  "/recommendations",
  "/inquiry",
  "/viewing-request",
  "/reservation-request",
  "/amenities",
  "/location",
  "/faq",
  "/privacy",
  "/terms",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/access-denied",
  "/auth",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => prefix !== "/" && (pathname === prefix || pathname.startsWith(`${prefix}/`)),
  );
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do not run code between createServerClient and getClaims().
  // Removing getClaims() can cause users to be randomly logged out under SSR.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const pathname = request.nextUrl.pathname;

  if (!claims && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Never allow personalized responses to be publicly cached.
  supabaseResponse.headers.set("Cache-Control", "private, no-store");

  return supabaseResponse;
}
