import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/crm/ContactForm";

export const metadata: Metadata = { title: "Reserve a unit" };

export default async function ReservePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = typeof sp.unitLabel === "string" ? sp.unitLabel : undefined;
  if (!raw) notFound();
  const unitLabel = decodeURIComponent(raw);
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Reserve</p>
        <h1 className="mt-1 text-3xl font-semibold text-neutral-900">Reserve {unitLabel}</h1>
        <p className="mt-2 text-neutral-600">
          Submit a reservation request. Availability is confirmed by our team before any commitment.
        </p>
      </header>
      <ContactForm kind="reservation" unitLabel={unitLabel} />
    </main>
  );
}
