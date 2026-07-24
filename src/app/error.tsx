"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
      <h1 style={{ fontSize: 32, margin: 0 }}>Something went wrong</h1>
      <p style={{ color: "var(--muted)" }}>
        An unexpected error occurred. Please try again.
        {error.digest ? (
          <>
            <br />
            <span style={{ fontSize: 12 }}>Reference: {error.digest}</span>
          </>
        ) : null}
      </p>
      <button
        onClick={reset}
        style={{
          background: "var(--surface-inverse)",
          color: "var(--text-inverse)",
          padding: "10px 18px",
          borderRadius: "var(--radius-sm)",
          border: "none",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </main>
  );
}
