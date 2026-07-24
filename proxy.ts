import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy boundary (formerly `middleware.ts`).
 *
 * Delegates to `updateSession`, which refreshes Supabase auth cookies and
 * performs an optimistic auth redirect. Authoritative authorization happens in
 * Server Components and API routes via `authenticate()`.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico / robots / sitemap
     * - static asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|glb|gltf)$).*)",
  ],
};
