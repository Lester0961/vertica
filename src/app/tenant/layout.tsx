import { requirePageRole } from "@/lib/security/guard";
import { ROLES } from "@/lib/security/roles";
import { PortalShell, type NavItem } from "@/components/layout/PortalShell";

const NAV: NavItem[] = [
  { href: "/tenant/dashboard", label: "Dashboard" },
  { href: "/tenant/unit", label: "My unit" },
  { href: "/tenant/lease", label: "Lease" },
  { href: "/tenant/bills", label: "Bills" },
  { href: "/tenant/payments", label: "Payments" },
  { href: "/tenant/maintenance", label: "Maintenance" },
  { href: "/tenant/gate-passes", label: "Gate passes" },
  { href: "/tenant/announcements", label: "Announcements" },
  { href: "/tenant/notifications", label: "Notifications" },
  { href: "/tenant/profile", label: "Profile" },
];

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requirePageRole([ROLES.TENANT], "/tenant/dashboard");
  return (
    <PortalShell title="Resident portal" nav={NAV} email={actor.email}>
      {children}
    </PortalShell>
  );
}
