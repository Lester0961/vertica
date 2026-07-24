import type { Metadata } from "next";

export const metadata: Metadata = { title: "FAQ" };

const FAQS: { q: string; a: string }[] = [
  { q: "Which units are currently available?", a: "The Available Units page always reflects live availability from the system — only units with an available status are shown." },
  { q: "What is included in the monthly rent?", a: "Each unit lists monthly rent and monthly association dues separately. A move-in quotation is shown before you inquire." },
  { q: "How does the recommendation system work?", a: "It removes units that fail your non-negotiables first, then ranks the rest with a reproducible weighted score and shows why each unit placed where it did." },
  { q: "Can I request a physical viewing?", a: "Yes. After an inquiry you can request a viewing; an administrator confirms a schedule." },
  { q: "How long does a reservation hold last?", a: "Reservation holds have a fixed expiry set by the property. Expired holds are released automatically." },
  { q: "How is my inquiry information used?", a: "Only to process your inquiry and follow up. See the Privacy page; production privacy wording is pending approval." },
];

export default function FaqPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "var(--space-8) var(--space-5)" }}>
      <p style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 12, color: "var(--muted)" }}>
        Questions &amp; answers
      </p>
      <h1 style={{ fontSize: 40, margin: "8px 0 var(--space-6)" }}>Frequently asked questions</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {FAQS.map((f) => (
          <details key={f.q} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--space-4)", background: "var(--surface)" }}>
            <summary style={{ fontWeight: 600, cursor: "pointer" }}>{f.q}</summary>
            <p style={{ color: "var(--muted)", marginBottom: 0 }}>{f.a}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
