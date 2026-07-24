import Link from "next/link";
import { getFeaturedUnits, getPropertySummary, getUnitTypes } from "@/features/property/queries";
import { UnitCard } from "@/components/units/UnitCard";
import { formatPeso } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const container: React.CSSProperties = { maxWidth: 1200, margin: "0 auto", padding: "0 var(--space-5)" };
const sectionPad: React.CSSProperties = { padding: "var(--space-8) 0" };
const eyebrow: React.CSSProperties = {
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontSize: 12,
  color: "var(--muted)",
};

export default async function LandingPage() {
  const [summary, featured, unitTypes] = await Promise.all([
    getPropertySummary(),
    getFeaturedUnits(),
    getUnitTypes(),
  ]);

  const badges = ["Best-priced available", "Best space value", "Earliest move-in"];

  return (
    <>
      {/* Hero */}
      <section style={{ ...sectionPad, background: "var(--surface)" }}>
        <div style={{ ...container, display: "grid", gap: "var(--space-6)", gridTemplateColumns: "1.1fr 0.9fr", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <p style={eyebrow}>Vertica Residences · A smarter way to rent</p>
            <h1 style={{ fontSize: 52, lineHeight: 1.03, margin: 0, fontWeight: 700 }}>
              A home chosen around the way you live.
            </h1>
            <p style={{ fontSize: 18, color: "var(--muted)", maxWidth: 560 }}>
              Vertica brings together thoughtfully planned residences, clear unit
              information, live availability, and an explainable recommendation
              assistant — so you can choose with confidence rather than guesswork.
            </p>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <Link href="/recommend" style={primaryBtn}>Find My Unit</Link>
              <Link href="/available-units" style={secondaryBtn}>View Available Units</Link>
            </div>
            <p style={{ fontSize: 14 }}>
              Already a resident or staff member?{" "}
              <Link href="/login" style={{ fontWeight: 600 }}>Log in →</Link>
            </p>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, #0b0b0b, #2a2a2a)",
              color: "var(--text-inverse)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-6)",
              minHeight: 320,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: "var(--space-3)",
            }}
          >
            <div className="tabular" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <Fact label="Residences" value="24" />
              <Fact label="Layouts" value="Studio–2BR" />
              <Fact label="Availability" value="Live" />
              <Fact label="Tours" value="360°" />
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "var(--space-3)" }}>
              {summary.availableCount > 0 && summary.lowestAvailableRent !== null ? (
                <p style={{ margin: 0, fontSize: 18 }}>
                  Available from <strong>{formatPeso(summary.lowestAvailableRent)}</strong> / month
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: 18 }}>Join the availability list</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* At a glance */}
      <section style={sectionPad}>
        <div style={container}>
          <p style={eyebrow}>The residence at a glance</p>
          <h2 style={{ fontSize: 34, margin: "8px 0 var(--space-6)" }}>Everything essential, nothing hidden.</h2>
          <div className="tabular" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-5)" }}>
            <Stat n="1" label="Mid-rise residential building" />
            <Stat n={String(summary.availableCount)} label="Residences available now" />
            <Stat n={String(summary.unitTypeCount)} label="Unit types to choose from" />
            <Stat n="2–7" label="Residential floors" />
          </div>
        </div>
      </section>

      {/* Featured units */}
      <section style={{ ...sectionPad, background: "var(--surface)" }}>
        <div style={container}>
          <p style={eyebrow}>Featured available units</p>
          <h2 style={{ fontSize: 34, margin: "8px 0 var(--space-6)" }}>Homes ready for the next chapter.</h2>
          {featured.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>
              No units are available right now.{" "}
              <Link href="/inquiry" style={{ fontWeight: 600 }}>Join the availability list →</Link>
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-5)" }}>
              {featured.map((u, i) => (
                <UnitCard key={u.id} unit={u} badge={badges[i]} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Unit finder CTA */}
      <section style={sectionPad}>
        <div style={{ ...container, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <p style={eyebrow}>Explainable unit finder</p>
            <h2 style={{ fontSize: 32, margin: 0 }}>Not sure which unit fits? Let the numbers explain.</h2>
            <p style={{ color: "var(--muted)" }}>
              Tell Vertica your budget, move-in timing, household size, minimum
              space, accessibility needs, and lifestyle priorities. The system
              filters out impossible choices first, then shows how each remaining
              unit earned its score.
            </p>
            <Link href="/recommend" style={{ ...primaryBtn, alignSelf: "flex-start" }}>
              Start the 3-minute questionnaire
            </Link>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              No hidden AI guesswork. Every filter and score is reproducible.
            </p>
          </div>
          <ol style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", listStyle: "none", padding: 0, margin: 0 }}>
            {["Tell us what matters.", "We check every non-negotiable.", "See ranked units with clear reasons."].map((s, i) => (
              <li key={s} style={{ display: "flex", gap: 12, alignItems: "center", padding: "var(--space-4)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--surface)" }}>
                <span className="tabular" style={{ fontWeight: 700, fontSize: 20, minWidth: 28 }}>0{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Unit types */}
      <section style={{ ...sectionPad, background: "var(--surface)" }}>
        <div style={container}>
          <p style={eyebrow}>Unit-type comparison</p>
          <h2 style={{ fontSize: 34, margin: "8px 0 var(--space-6)" }}>Choose the amount of space that feels right.</h2>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(unitTypes.length, 1)}, 1fr)`, gap: "var(--space-5)" }}>
            {unitTypes.map((t) => (
              <div key={t.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 20 }}>{t.name}</h3>
                <p style={{ color: "var(--muted)", fontSize: 14, margin: 0, flex: 1 }}>{t.description}</p>
                <div className="tabular" style={{ fontSize: 14 }}>
                  <div>{t.minArea && t.maxArea ? `${t.minArea}–${t.maxArea} m²` : "—"}</div>
                  <div style={{ color: "var(--muted)" }}>
                    {t.minRent && t.maxRent ? `${formatPeso(t.minRent)}–${formatPeso(t.maxRent)}/mo` : "—"}
                  </div>
                </div>
                <Link href="/available-units" style={{ fontSize: 14, fontWeight: 600 }}>
                  View available {t.name} units →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final inquiry CTA */}
      <section style={sectionPad}>
        <div style={{ ...container, textAlign: "center", display: "flex", flexDirection: "column", gap: "var(--space-4)", alignItems: "center" }}>
          <p style={eyebrow}>Ready when you are</p>
          <h2 style={{ fontSize: 34, margin: 0, maxWidth: 640 }}>See whether Vertica is the right fit.</h2>
          <p style={{ color: "var(--muted)", maxWidth: 560 }}>
            Send an inquiry and we&apos;ll follow up with next steps. Submitting is
            not yet an approved reservation.
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/inquiry" style={primaryBtn}>Send Inquiry</Link>
            <Link href="/recommend" style={secondaryBtn}>Find My Unit</Link>
          </div>
        </div>
      </section>
    </>
  );
}

const primaryBtn: React.CSSProperties = {
  background: "var(--surface-inverse)",
  color: "var(--text-inverse)",
  padding: "12px 20px",
  borderRadius: "var(--radius-sm)",
  textDecoration: "none",
  fontWeight: 600,
};
const secondaryBtn: React.CSSProperties = {
  background: "var(--surface)",
  color: "var(--text)",
  padding: "12px 20px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border-strong)",
  textDecoration: "none",
  fontWeight: 600,
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--border-strong)" }} />
        <span style={{ fontSize: 40, fontWeight: 700 }}>{n}</span>
      </div>
      <span style={{ fontSize: 14, color: "var(--muted)" }}>{label}</span>
    </div>
  );
}
