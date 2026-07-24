import { requirePageRole } from "@/lib/security/guard";
import { ROLES } from "@/lib/security/roles";
import { PortalShell, type NavItem } from "@/components/layout/PortalShell";

const NAV: NavItem[] = [
  { href: "/guard/verify", label: "Verify pass" },
  { href: "/guard/recent-verifications", label: "Recent verifications" },
];

export default async function GuardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requirePageRole(
    [ROLES.GUARD, ROLES.SUPER_ADMIN, ROLES.PROPERTY_ADMIN],
    "/guard/verify",
  );
  return (
    <PortalShell title="Gate security" nav={NAV} email={actor.email}>
      {children}
    </PortalShell>
  );
}
