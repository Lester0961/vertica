"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { NavigationShortcuts, type NavigationShortcut } from "@/components/navigation/NavigationShortcuts";

export interface NavItem {
  href: string;
  label: string;
}

const PORTAL_KEYS: Record<string, string> = {
  Dashboard: "D", Units: "U", "My unit": "U", Clients: "C", Inquiries: "I", Reservations: "R",
  Tenants: "T", Leases: "L", Billing: "B", Payments: "P", Maintenance: "M", "Gate passes": "G",
  Announcements: "N", Reports: "O", Users: "S", "Audit logs": "A", "Verify pass": "V",
  "Recent verifications": "R", Assigned: "A", Schedule: "S", Completed: "C", Bills: "B",
  Notifications: "O", Profile: "F", Lease: "L",
};

const PORTAL_GROUPS: Record<string, string> = {
  Dashboard: "Overview",
  "Verify pass": "Overview",
  Assigned: "Overview",
  "My unit": "My residence",
  Lease: "My residence",
  Bills: "My residence",
  Payments: "My residence",
  Maintenance: "Services",
  "Gate passes": "Services",
  Announcements: "Services",
  Notifications: "Services",
  Schedule: "Work queue",
  Completed: "Work queue",
  "Recent verifications": "Verification",
  Units: "Property",
  Clients: "Property",
  Inquiries: "Property",
  Reservations: "Property",
  Tenants: "Property",
  Leases: "Property",
  Billing: "Finance",
  Reports: "Insights",
  "Audit logs": "Access",
  Users: "Access",
  Profile: "Account",
};

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
  const shortcuts = useMemo<NavigationShortcut[]>(() => nav.map((item, index) => ({ keys: `G ${PORTAL_KEYS[item.label] ?? String(index + 1)}`, label: item.label, href: item.href })), [nav]);

  return (
    <div className="portal-shell">
      <a className="skip-link" href="#portal-main-content">Skip to content</a>
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
          {nav.map((item, index) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const shortcut = shortcuts.find((entry) => entry.href === item.href)?.keys;
            const group = PORTAL_GROUPS[item.label] ?? "Workspace";
            const previousGroup = index > 0 ? PORTAL_GROUPS[nav[index - 1]?.label ?? ""] ?? "Workspace" : null;
            return (
              <Fragment key={item.href}>
                {group !== previousGroup && <span className="portal-nav-section" aria-hidden="true">{group}</span>}
                <Link href={item.href} aria-keyshortcuts={shortcut} onClick={() => setMobileOpen(false)} className={active ? "portal-nav-link portal-nav-link--active" : "portal-nav-link"}>
                  <span>{item.label}</span>
                </Link>
              </Fragment>
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
          <div className="portal-topbar-title">
            <span className="portal-topbar-kicker">Workspace</span>
            <strong>{title}</strong>
          </div>
          <div className="portal-topbar-actions"><NavigationShortcuts items={shortcuts} contextItems={[]} title={`${title} shortcuts`} /><span className="portal-topbar-account">{email ?? "Signed-in account"}</span></div>
        </header>
        <main id="portal-main-content">{children}</main>
      </div>
    </div>
  );
}
