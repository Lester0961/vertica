export function PublicPagePlaceholder({
  eyebrow,
  title,
  description,
  phase,
}: {
  eyebrow: string;
  title: string;
  description: string;
  phase?: string;
}) {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "var(--space-8) var(--space-5)" }}>
      <p style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 12, color: "var(--muted)" }}>
        {eyebrow}
      </p>
      <h1 style={{ fontSize: 40, margin: "8px 0 var(--space-4)" }}>{title}</h1>
      <p style={{ color: "var(--muted)", fontSize: 18, maxWidth: 640 }}>{description}</p>
      {phase ? (
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: "var(--space-5)" }}>
          <span aria-hidden style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--border-strong)", marginRight: 8 }} />
          Scheduled for {phase}.
        </p>
      ) : null}
    </main>
  );
}
