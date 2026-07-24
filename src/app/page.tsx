import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: "var(--space-5)",
        padding: "var(--space-8)",
        maxWidth: 880,
        margin: "0 auto",
      }}
    >
      <p
        style={{
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontSize: 12,
          color: "var(--muted)",
        }}
      >
        Vertica Residences · A smarter way to rent
      </p>
      <h1 style={{ fontSize: 48, lineHeight: 1.05, margin: 0, fontWeight: 700 }}>
        A home chosen around the way you live.
      </h1>
      <p style={{ fontSize: 18, color: "var(--muted)", maxWidth: 640 }}>
        Vertica brings together thoughtfully planned residences, clear unit
        information, live availability, and an explainable recommendation
        assistant — so you can choose with confidence rather than guesswork.
      </p>
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <Link
          href="/recommend"
          style={{
            background: "var(--surface-inverse)",
            color: "var(--text-inverse)",
            padding: "12px 20px",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Find My Unit
        </Link>
        <Link
          href="/available-units"
          style={{
            background: "var(--surface)",
            color: "var(--text)",
            padding: "12px 20px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-strong)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          View Available Units
        </Link>
      </div>
      <p style={{ fontSize: 14, color: "var(--muted)" }}>
        Fictional academic project. Phase 0 scaffold — full landing page arrives
        in Phase 4.
      </p>
    </main>
  );
}
