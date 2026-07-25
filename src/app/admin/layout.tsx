import { requirePageRole } from "@/lib/security/guard";
import { ROLES } from "@/lib/security/roles";
import { PortalShell, type NavItem } from "@/components/layout/PortalShell";

const NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/units", label: "Units" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/inquiries", label: "Inquiries" },
  { href: "/admin/reservations", label: "Reservations" },
  { href: "/admin/tenants", label: "Tenants" },
  { href: "/admin/leases", label: "Leases" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/maintenance", label: "Maintenance" },
  { href: "/admin/gate-passes", label: "Gate passes" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit-logs", label: "Audit logs" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requirePageRole([ROLES.SUPER_ADMIN, ROLES.PROPERTY_ADMIN], "/admin/dashboard");
  return (
    <PortalShell title="Administration" nav={NAV} email={actor.email}>
      {children}
    </PortalShell>
  );
}
