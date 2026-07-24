import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "70dvh",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "var(--space-6)",
      }}
    >
      <h1 style={{ fontSize: 32, margin: 0 }}>Page not found</h1>
      <p style={{ color: "var(--muted)" }}>
        The page you are looking for does not exist or is not visible to you.
      </p>
      <Link href="/" style={{ fontWeight: 600 }}>
        Return home →
      </Link>
    </main>
  );
}
