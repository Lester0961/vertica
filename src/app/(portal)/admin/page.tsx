import Link from "next/link";
import { requirePageRole } from "@/lib/security/guard";
import { getDashboardStats } from "@/features/staff/queries";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requirePageRole(["SUPER_ADMIN", "PROPERTY_ADMIN"]);
  const stats = await getDashboardStats();

  const cards = [
    { label: "Available units", value: stats.availableUnits, href: "/admin/leases" },
    { label: "New inquiries", value: stats.newInquiries, href: "/admin/inquiries" },
    { label: "Pending reservations", value: stats.pendingReservations, href: "/admin/leases" },
    { label: "Active leases", value: stats.activeLeases, href: "/admin/leases" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Admin dashboard</h1>
      <p className="mt-1 text-neutral-600">Vertica Residences — operations overview.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-neutral-200 bg-white p-5 hover:border-emerald-400"
          >
            <p className="text-sm text-neutral-500">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold text-neutral-900">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/leases"
          className="rounded-xl bg-emerald-600 px-5 py-4 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Manage leases &amp; create a lease →
        </Link>
        <Link
          href="/admin/inquiries"
          className="rounded-xl border border-neutral-300 px-5 py-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Review inquiries →
        </Link>
      </div>
    </div>
  );
}
