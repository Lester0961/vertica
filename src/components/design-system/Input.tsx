import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, hint, id, style, ...rest }, ref) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor={inputId} style={{ fontSize: 14, fontWeight: 600 }}>
          {label}
        </label>
        {hint ? (
          <span id={hintId} style={{ fontSize: 13, color: "var(--muted)" }}>
            {hint}
          </span>
        ) : null}
        <input
          {...rest}
          id={inputId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error ? errorId : null, hint ? hintId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          style={{
            minHeight: 44,
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            border: `1px solid ${error ? "var(--danger)" : "var(--border-strong)"}`,
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 15,
            ...style,
          }}
        />
        {error ? (
          <span id={errorId} role="alert" style={{ fontSize: 13, color: "var(--danger)" }}>
            {error}
          </span>
        ) : null}
      </div>
    );
  },
);
