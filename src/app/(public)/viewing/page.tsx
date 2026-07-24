import type { Metadata } from "next";
import { ContactForm } from "@/components/crm/ContactForm";

export const metadata: Metadata = { title: "Request a viewing" };

export default async function ViewingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const unitLabel = typeof sp.unitLabel === "string" ? decodeURIComponent(sp.unitLabel) : undefined;
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Book a tour</p>
        <h1 className="mt-1 text-3xl font-semibold text-neutral-900">Request a viewing</h1>
        <p className="mt-2 text-neutral-600">
          Pick a date and the unit(s) you&apos;d like to see. Our team will confirm by email.
        </p>
      </header>
      <ContactForm kind="viewing" unitLabel={unitLabel} />
    </main>
  );
}
