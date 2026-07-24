import Link from "next/link";
import { LogoutButton } from "@/components/layout/LogoutButton";

export interface NavItem {
  href: string;
  label: string;
}

export function PortalShell({
  title,
  nav,
  email,
  children,
}: {
  title: string;
  nav: NavItem[];
  email: string | null;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: "var(--bg)" }}>
      <aside
        style={{
          width: 256,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "var(--space-5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
          position: "sticky",
          top: 0,
          height: "100dvh",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 700,
            fontSize: 18,
            textDecoration: "none",
          }}
        >
          VERTICA
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text)" }} />
        </Link>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
            {title}
          </span>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                textDecoration: "none",
                fontSize: 14,
                color: "var(--text)",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--muted)", wordBreak: "break-all" }}>{email}</span>
          <LogoutButton />
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            height: 64,
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
            display: "flex",
            alignItems: "center",
            padding: "0 var(--space-6)",
            fontWeight: 600,
          }}
        >
          {title}
        </header>
        <main style={{ padding: "var(--space-6)", flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
