import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "var(--space-6)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 700,
            fontSize: 20,
            textDecoration: "none",
            marginBottom: "var(--space-5)",
          }}
        >
          VERTICA
          <span
            aria-hidden
            style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text)" }}
          />
        </Link>
        {children}
      </div>
    </main>
  );
}
