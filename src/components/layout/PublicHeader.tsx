"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/units", label: "Residences" },
  { href: "/explore", label: "Building map" },
  { href: "/amenities", label: "Amenities" },
  { href: "/recommend", label: "Find my unit" },
  { href: "/inquiry", label: "Inquire" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const onLanding = pathname === "/";

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  const classes = [
    "public-header",
    onLanding ? "public-header--landing" : "",
    open ? "public-header--open" : "",
  ].filter(Boolean).join(" ");

  return (
    <header className={classes}>
      <div className="public-header-inner">
        <Link href="/" className="brand-mark" aria-label="Vertica home" onClick={() => setOpen(false)}>
          <span>VERTICA</span><i aria-hidden />
        </Link>
        <nav id="public-navigation" className="public-nav" aria-label="Primary navigation">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname.startsWith(link.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="public-mobile-login" onClick={() => setOpen(false)}>Portal login</Link>
        </nav>
        <div className="public-actions">
          <Link href="/login" className="public-login">Portal login</Link>
          <Link href="/units" className="public-cta">View availability <span aria-hidden>→</span></Link>
        </div>
        <button
          type="button"
          className="public-menu-button"
          aria-expanded={open}
          aria-controls="public-navigation"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((value) => !value)}
        >
          <span>{open ? "Close" : "Menu"}</span>
          <i aria-hidden />
        </button>
      </div>
    </header>
  );
}
