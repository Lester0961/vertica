import * as React from "react";

type Tone = "info" | "success" | "warning" | "danger";

const tones: Record<Tone, { border: string; color: string; background: string }> = {
  info: { border: "var(--info)", color: "var(--info)", background: "var(--info-soft)" },
  success: { border: "var(--success)", color: "var(--success)", background: "var(--success-soft)" },
  warning: { border: "var(--warning)", color: "var(--warning)", background: "var(--warning-soft)" },
  danger: { border: "var(--danger)", color: "var(--danger)", background: "var(--danger-soft)" },
};

export function Alert({
  tone = "info",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  const t = tones[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "12px 14px",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${t.border}`,
        background: t.background,
        color: t.color,
        fontSize: 14,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: t.color,
          marginTop: 6,
          flexShrink: 0,
        }}
      />
      <div style={{ color: "var(--text-soft)" }}>{children}</div>
    </div>
  );
}
