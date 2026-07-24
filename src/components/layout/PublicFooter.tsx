import Link from "next/link";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/available-units", label: "Available units" },
      { href: "/amenities", label: "Amenities" },
      { href: "/location", label: "Location" },
      { href: "/recommend", label: "Find my unit" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Login" },
      { href: "/inquiry", label: "Send an inquiry" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/faq", label: "FAQ" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", marginTop: "var(--space-8)" }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "var(--space-7) var(--space-5)",
          display: "grid",
          gap: "var(--space-6)",
          gridTemplateColumns: "1.5fr repeat(3, 1fr)",
        }}
      >
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 20 }}>
            VERTICA
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text)" }} />
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13, maxWidth: 320, marginTop: 12 }}>
            A fictional academic project. All figures, images, and claims are
            synthetic and for demonstration only.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", margin: "0 0 12px" }}>
              {col.title}
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} style={{ fontSize: 14, textDecoration: "none", color: "var(--text)" }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid var(--border)", padding: "var(--space-4) var(--space-5)" }}>
        <p style={{ maxWidth: 1200, margin: "0 auto", fontSize: 12, color: "var(--muted)" }}>
          © {new Date().getFullYear()} Vertica (fictional). Legal-configuration
          status pending independent verification.
        </p>
      </div>
    </footer>
  );
}
