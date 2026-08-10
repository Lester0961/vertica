import * as React from "react";

type Variant = "primary" | "secondary" | "tertiary" | "danger";

const base: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 44,
  padding: "10px 20px",
  borderRadius: "var(--radius-sm)",
  fontWeight: 720,
  fontSize: 15,
  cursor: "pointer",
  textDecoration: "none",
  lineHeight: 1.2,
  letterSpacing: "-0.01em",
  transition: "opacity 140ms ease, transform 180ms ease, box-shadow 180ms ease",
};

const variants: Record<Variant, React.CSSProperties> = {
  primary: { background: "var(--accent)", color: "var(--text-inverse)", border: "1px solid var(--accent)", boxShadow: "0 10px 30px color-mix(in srgb, var(--accent) 20%, transparent)" },
  secondary: { background: "var(--surface-elevated)", color: "var(--text)", border: "1px solid var(--border-strong)" },
  tertiary: { background: "transparent", color: "var(--text)", border: "none", padding: "8px 4px", minHeight: 0 },
  danger: { background: "var(--danger)", color: "#fff", border: "1px solid var(--danger)" },
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  style,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={{
        ...base,
        ...variants[variant],
        opacity: isDisabled ? 0.6 : 1,
        cursor: isDisabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
