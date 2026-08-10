"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="portal-shell">
      <aside className={mobileOpen ? "portal-sidebar portal-sidebar--open" : "portal-sidebar"}>
        <div className="portal-sidebar-head">
          <Link href="/" className="brand-mark" aria-label="Vertica home">
            <span>VERTICA</span><i aria-hidden />
          </Link>
          <button type="button" className="portal-menu-button" aria-expanded={mobileOpen} aria-controls="portal-navigation" onClick={() => setMobileOpen((open) => !open)}>
            {mobileOpen ? "Close menu" : "Open menu"}
          </button>
        </div>

        <nav id="portal-navigation" className="portal-nav" aria-label={`${title} navigation`}>
          <span className="portal-nav-label">{title}</span>
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={active ? "portal-nav-link portal-nav-link--active" : "portal-nav-link"}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="portal-account">
          <span title={email ?? undefined}>{email ?? "Signed-in account"}</span>
          <LogoutButton />
        </div>
      </aside>

      <div className="portal-content">
        <header className="portal-topbar">
          <span>{title}</span>
          <span className="portal-topbar-account">{email ?? "Signed-in account"}</span>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
