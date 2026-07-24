export function PagePlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase?: string;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, margin: 0 }}>{title}</h1>
      <p style={{ color: "var(--muted)", margin: 0 }}>{description}</p>
      {phase ? (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>
          <span
            aria-hidden
            style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--border-strong)", marginRight: 8 }}
          />
          Scheduled for {phase}.
        </p>
      ) : null}
    </section>
  );
}
