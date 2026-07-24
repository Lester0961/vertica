"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 32, margin: 0 }}>Application error</h1>
        <p style={{ color: "#6f6f6a" }}>
          A critical error occurred.
          {error.digest ? ` Reference: ${error.digest}` : null}
        </p>
        <button
          onClick={reset}
          style={{
            background: "#0b0b0b",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 6,
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
