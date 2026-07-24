import type { Metadata } from "next";
import Link from "next/link";
import { UnitDetailCard } from "@/components/units/UnitDetailCard";
import { getUnitsByLabels } from "@/features/units/queries";

export const metadata: Metadata = { title: "Compare units" };

function splitLabels(sp: Record<string, string | string[] | undefined>): string[] {
  const raw = sp.labels ?? sp.label;
  const decode = (s: string) => decodeURIComponent(s.trim());
  if (Array.isArray(raw)) return raw.map(decode).filter(Boolean).slice(0, 3);
  if (typeof raw === "string") return raw.split(",").map(decode).filter(Boolean).slice(0, 3);
  return [];
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const labels = splitLabels(sp);
  const units = labels.length ? await getUnitsByLabels(labels) : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/units" className="text-sm text-neutral-500 hover:text-neutral-700">
        ← All units
      </Link>
      <header className="mt-3">
        <h1 className="text-3xl font-semibold text-neutral-900">Compare units</h1>
        <p className="mt-2 text-neutral-600">Up to three residences, side by side.</p>
      </header>

      {units.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-neutral-300 p-10 text-center text-neutral-500">
          Pick units from <Link href="/units" className="text-emerald-600 underline">the catalogue</Link> to compare.
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {units.map((u) => (
            <UnitDetailCard key={u.id} unit={u} />
          ))}
        </div>
      )}
    </main>
  );
}
