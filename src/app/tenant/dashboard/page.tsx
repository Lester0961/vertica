"use client";

import Link from "next/link";

const SERVICES = [
  { href: "/tenant/bills", label: "Bills and payments", description: "Review your ledger, download invoices, and submit a payment.", index: "01" },
  { href: "/tenant/maintenance", label: "Maintenance", description: "Submit a service request and follow each status update.", index: "02" },
  { href: "/tenant/gate-passes", label: "Gate passes", description: "Issue time-bound visitor access for your residence.", index: "03" },
  { href: "/tenant/announcements", label: "Announcements", description: "Stay current with building notices and community updates.", index: "04" },
  { href: "/tenant/notifications", label: "Notifications", description: "Review the alerts that need your attention.", index: "05" },
  { href: "/tenant/profile", label: "My profile", description: "Keep your contact details accurate and ready for service.", index: "06" },
];

export default function TenantDashboardPage() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Resident portal</p>
        <h1>{greeting}</h1>
        <p>Everything connected to your residence, with the next useful action always close at hand.</p>
      </header>
      <section aria-label="Resident services" className="workflow-grid">
        {SERVICES.map((service) => (
          <Link key={service.href} href={service.href} className="workflow-card">
            <div>
              <span className="workflow-card__index">{service.index}</span>
              <h2>{service.label}</h2>
              <p>{service.description}</p>
            </div>
            <span className="workflow-card__link">Open service →</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
