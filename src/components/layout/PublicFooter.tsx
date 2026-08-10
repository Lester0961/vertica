import Link from "next/link";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/units", label: "Available residences" },
      { href: "/explore", label: "Interactive building map" },
      { href: "/amenities", label: "Amenities" },
      { href: "/location", label: "Location" },
    ],
  },
  {
    title: "Plan your visit",
    links: [
      { href: "/recommend", label: "Find my unit" },
      { href: "/inquiry", label: "Send an inquiry" },
      { href: "/viewing", label: "Request a viewing" },
      { href: "/login", label: "Resident and staff portal" },
    ],
  },
  {
    title: "Information",
    links: [
      { href: "/faq", label: "Frequently asked questions" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer-main">
        <div className="public-footer-brand">
          <Link href="/" className="brand-mark" aria-label="Vertica home">
            <span>VERTICA</span><i aria-hidden />
          </Link>
          <p>A clearer way to discover, choose, and manage a condominium residence.</p>
          <Link className="public-footer-contact" href="/inquiry">
            Start a conversation <span aria-hidden>→</span>
          </Link>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2>{column.title}</h2>
            <ul>
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="public-footer-meta">
        <p>© {new Date().getFullYear()} Vertica Residences</p>
        <p>
          Fictional academic project. Property imagery, figures, and claims are synthetic and
          provided for presentation and classroom demonstration only.
        </p>
      </div>
    </footer>
  );
}
