import Link from "next/link";

const LINKS = [
  { href: "/units", label: "Residences" },
  { href: "/available-units", label: "Available Units" },
  { href: "/amenities", label: "Amenities" },
  { href: "/location", label: "Location" },
  { href: "/recommend", label: "Find My Unit" },
  { href: "/inquiry", label: "Inquire" },
  { href: "/explore", label: "Explore Building" },
];

export function PublicHeader() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 var(--space-5)",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)",
        }}
      >
        <Link
          href="/"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 20, textDecoration: "none" }}
        >
          VERTICA
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text)" }} />
        </Link>

        <nav style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }} aria-label="Primary">
          {LINKS.map((l, i) => (
            <Link
              key={`${l.href}-${i}`}
              href={l.href}
              style={{ fontSize: 14, textDecoration: "none", color: "var(--muted)" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <Link href="/login" style={{ fontSize: 14, textDecoration: "none", fontWeight: 600 }}>
            Resident &amp; Staff Login
          </Link>
          <Link
            href="/available-units"
            style={{
              background: "var(--surface-inverse)",
              color: "var(--text-inverse)",
              padding: "9px 16px",
              borderRadius: "var(--radius-sm)",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            View Available Units
          </Link>
        </div>
      </div>
    </header>
  );
}
