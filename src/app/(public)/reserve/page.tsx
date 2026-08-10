import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/crm/ContactForm";
import { listPublicUnits } from "@/features/units/queries";

export const metadata: Metadata = { title: "Reserve a unit" };
export default async function ReservePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = typeof sp.unitLabel === "string" ? sp.unitLabel : undefined;
  const unitLabel = raw ? decodeURIComponent(raw) : null;
  const units = unitLabel ? [] : await listPublicUnits({ limit: 200 });
  return <main className="mx-auto max-w-3xl px-4 py-10"><header className="mb-6"><p className="eyebrow">Reserve</p><h1 className="mt-1 text-3xl font-semibold text-neutral-900">{unitLabel ? `Reserve ${unitLabel}` : "Choose a residence to reserve"}</h1><p className="mt-2 text-neutral-600">Submit a reservation request. Availability is confirmed by the property team before the 48-hour demo hold is created.</p></header>{unitLabel ? <ContactForm kind="reservation" unitLabel={unitLabel} /> : units.length ? <div className="grid gap-3 sm:grid-cols-2">{units.map((unit) => <Link key={unit.id} href={`/reserve?unitLabel=${encodeURIComponent(unit.publicLabel)}`} className="surface-card p-5 no-underline transition hover:-translate-y-1 hover:shadow-lg"><strong className="block text-neutral-900">{unit.publicLabel}</strong><span className="mt-1 block text-sm text-neutral-600">{unit.unitTypeName} · {unit.floorLabel}</span></Link>)}</div> : <div className="empty-state">No units are currently available.</div>}</main>;
}
