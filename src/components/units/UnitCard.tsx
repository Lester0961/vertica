import Link from "next/link";
import { formatArea, formatDate, formatPeso } from "@/lib/utils/format";

export interface UnitCardData {
  publicLabel: string;
  unitTypeName: string;
  areaSqm: number;
  monthlyRent: number;
  monthlyDues: number;
  capacity: number | null;
  bedrooms: number;
  bathrooms: number;
  availableFrom: string | null;
}

export function UnitCard({ unit, badge }: { unit: UnitCardData; badge?: string }) {
  return (
    <article
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        aria-hidden
        style={{
          aspectRatio: "4 / 3",
          background: "linear-gradient(135deg, #ececea, #f7f7f5)",
          display: "grid",
          placeItems: "center",
          color: "var(--border-strong)",
          fontSize: 13,
          letterSpacing: "0.1em",
        }}
      >
        {unit.unitTypeName.toUpperCase()}
      </div>
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{unit.publicLabel}</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--success)",
              fontWeight: 600,
            }}
          >
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
            Available
          </span>
        </div>
        {badge ? (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{badge}</span>
        ) : null}
        <div style={{ fontSize: 14, color: "var(--muted)" }}>
          {unit.unitTypeName} · {formatArea(unit.areaSqm)} ·{" "}
          {unit.bedrooms === 0 ? "Studio" : `${unit.bedrooms} BR`} · {unit.bathrooms} bath
          {unit.capacity ? ` · up to ${unit.capacity}` : ""}
        </div>
        <div className="tabular" style={{ display: "flex", gap: "var(--space-4)", marginTop: "auto" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Monthly rent</div>
            <div style={{ fontWeight: 700 }}>{formatPeso(unit.monthlyRent)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Dues</div>
            <div style={{ fontWeight: 700 }}>{formatPeso(unit.monthlyDues)}</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          Available from {formatDate(unit.availableFrom)}
        </div>
        <Link
          href="/available-units"
          style={{
            marginTop: 4,
            textAlign: "center",
            background: "var(--surface-inverse)",
            color: "var(--text-inverse)",
            padding: "10px 16px",
            borderRadius: "var(--radius-sm)",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          View Unit
        </Link>
      </div>
    </article>
  );
}
