"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NavigationShortcuts, PUBLIC_SHORTCUTS } from "@/components/navigation/NavigationShortcuts";

const LINKS = [
  { href: "/units", label: "Residences", keys: "G R" },
  { href: "/explore", label: "Building map", keys: "G B" },
  { href: "/amenities", label: "Amenities", keys: "G A" },
  { href: "/recommend", label: "Find my unit", keys: "G F" },
  { href: "/inquiry", label: "Inquire", keys: "G I" },
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
              aria-keyshortcuts={link.keys}
              aria-current={pathname.startsWith(link.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <span>{link.label}</span>
            </Link>
          ))}
          <Link href="/login" className="public-mobile-login" onClick={() => setOpen(false)}>Portal login</Link>
        </nav>
        <div className="public-actions">
          <NavigationShortcuts items={PUBLIC_SHORTCUTS} onNavigate={() => setOpen(false)} />
          <Link href="/login" className="public-login">Portal login</Link>
          <Link href="/units" className="public-cta" aria-label="View availability">
            <span className="public-cta-label">View availability</span><span aria-hidden>→</span>
          </Link>
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
