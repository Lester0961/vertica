import Link from "next/link";
import { formatPeso, formatArea } from "@/lib/utils/format";
import type { UnitDetail } from "@/features/units/queries";

function featureValue(f: UnitDetail["features"][number]): string {
  if (f.valueBoolean !== null) return f.valueBoolean ? "Yes" : "No";
  if (f.valueNumeric !== null) return String(f.valueNumeric);
  if (f.valueText !== null) return f.valueText;
  return "—";
}

export function UnitDetailCard({ unit }: { unit: UnitDetail }) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold text-neutral-900">{unit.publicLabel}</h1>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          Available
        </span>
      </div>
      <p className="mt-1 text-neutral-600">
        {unit.buildingName} · Floor {unit.floorNumber} ({unit.floorLabel}) · {unit.unitTypeName}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Monthly rent" value={formatPeso(unit.monthlyRent)} highlight />
        <Stat label="Monthly dues" value={formatPeso(unit.monthlyDues)} />
        <Stat label="Floor area" value={formatArea(unit.areaSqm)} />
        <Stat label="Bed / Bath" value={`${unit.bedrooms} / ${unit.bathrooms}`} />
      </div>

      <dl className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <Row label="Capacity" value={unit.capacity ? `${unit.capacity} persons` : "—"} />
        <Row label="Furnishing" value={unit.furnishing?.replace("_", " ").toLowerCase() ?? "—"} />
        <Row label="Orientation" value={unit.orientation ?? "—"} />
        <Row label="Min. lease" value={`${unit.minLeaseMonths} months`} />
        <Row label="Available from" value={unit.availableFrom ?? "Now"} />
      </dl>

      {unit.features.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Features</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {unit.features.map((f) => (
              <li key={f.code} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                <span className="text-neutral-600">{f.label}</span>
                <span className="font-medium text-neutral-900">{featureValue(f)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-7 flex flex-wrap gap-3">
        <a
          href="/inquiry"
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Inquire about this unit
        </a>
        <a
          href="/recommend"
          className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Get a recommendation
        </a>
        <Link
          href="/units"
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-700"
        >
          Back to all units
        </Link>
      </div>
    </article>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${highlight ? "text-emerald-700" : "text-neutral-900"}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 pb-2 text-sm">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium capitalize text-neutral-900">{value}</dd>
    </div>
  );
}
