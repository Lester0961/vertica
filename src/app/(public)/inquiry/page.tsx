import type { Metadata } from "next";
import { ContactForm } from "@/components/crm/ContactForm";

export const metadata: Metadata = { title: "Inquire" };

export default function InquiryPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Contact</p>
        <h1 className="mt-1 text-3xl font-semibold text-neutral-900">Inquire about Vertica</h1>
        <p className="mt-2 text-neutral-600">
          Tell us what you&apos;re looking for and we&apos;ll get back to you. You can also browse units and request a
          viewing directly.
        </p>
      </header>
      <ContactForm kind="inquiry" />
    </main>
  );
}
