import type { Metadata } from "next";
import Link from "next/link";
import { authenticate } from "@/lib/security/authenticate";
import { resolveHomeRoute } from "@/lib/security/roles";

export const metadata: Metadata = { title: "Access denied" };

export default async function AccessDeniedPage() {
  const actor = await authenticate();
  const home = actor ? resolveHomeRoute(actor.roles) : "/login";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1 style={{ fontSize: 26, margin: 0 }}>Access denied</h1>
      <p style={{ color: "var(--muted)", margin: 0 }}>
        Your account does not have permission to view that page.
      </p>
      <Link href={home} style={{ fontWeight: 600 }}>
        Go to your portal →
      </Link>
    </div>
  );
}
