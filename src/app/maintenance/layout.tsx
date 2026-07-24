import { requirePageRole } from "@/lib/security/guard";
import { ROLES } from "@/lib/security/roles";
import { PortalShell, type NavItem } from "@/components/layout/PortalShell";

const NAV: NavItem[] = [
  { href: "/maintenance/assigned", label: "Assigned" },
  { href: "/maintenance/schedule", label: "Schedule" },
  { href: "/maintenance/completed", label: "Completed" },
];

export default async function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requirePageRole([ROLES.MAINTENANCE], "/maintenance/assigned");
  return (
    <PortalShell title="Maintenance" nav={NAV} email={actor.email}>
      {children}
    </PortalShell>
  );
}
