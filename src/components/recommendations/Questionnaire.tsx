"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/design-system/Input";

const PRIORITY_OPTIONS = [
  "low_rent",
  "near_elevator",
  "quiet",
  "city_view",
  "furnished",
  "high_floor",
  "natural_light",
  "pet_friendly",
  "parking",
  "gym_access",
  "workspace",
  "balcony",
];

interface Rec {
  publicLabel: string;
  unitTypeCode: string;
  bedrooms: number;
  bathrooms: number;
  floorNumber: number;
  areaSqm: number;
  monthlyRent: number;
  monthlyDues: number;
  score: number;
  reasons: string[];
}

export function Questionnaire() {
  const [budgetMax, setBudgetMax] = useState("");
  const [householdSize, setHouseholdSize] = useState("1");
  const [bedrooms, setBedrooms] = useState("");
  const [moveInBy, setMoveInBy] = useState("");
  const [priorities, setPriorities] = useState<string[]>(["low_rent"]);
  const [pets, setPets] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Rec[] | null>(null);

  const togglePriority = (p: string) =>
    setPriorities((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/recommendations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          budgetMax: Number(budgetMax) || 0,
          householdSize: Number(householdSize) || 1,
          preferredBedrooms: bedrooms ? Number(bedrooms) : undefined,
          moveInBy: moveInBy || undefined,
          priorities,
          pets,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "SUCCESS") {
        throw new Error(json.message ?? "Recommendation failed.");
      }
      setResults(json.data.recommendations);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <form
        className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h2 className="text-lg font-semibold text-neutral-900">Tell us what you need</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Max monthly budget (₱)"
            type="number"
            inputMode="numeric"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            required
          />
          <Input
            label="Household size"
            type="number"
            inputMode="numeric"
            value={householdSize}
            onChange={(e) => setHouseholdSize(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Preferred bedrooms (optional)"
            type="number"
            inputMode="numeric"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
          />
          <Input label="Move-in by (optional)" type="date" value={moveInBy} onChange={(e) => setMoveInBy(e.target.value)} />
        </div>

        <fieldset>
          <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-600">
            Priorities (pick any)
          </legend>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map((p) => {
              const active = priorities.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePriority(p)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    active
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  {p.replace(/_/g, " ")}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={pets} onChange={(e) => setPets(e.target.checked)} />
          I have pets
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Finding your matches…" : "Get recommendations"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <section>
        {results === null ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-neutral-500">
            Your top matches will appear here.
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-neutral-500">
            No units match those constraints yet. Try raising your budget or removing a priority.
          </div>
        ) : (
          <ul className="space-y-3">
            {results.map((r) => (
              <li key={r.publicLabel} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <Link href={`/units/${encodeURIComponent(r.publicLabel)}`} className="font-semibold text-neutral-900 hover:underline">
                    {r.publicLabel}
                  </Link>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {r.score}% match
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-600">
                  {r.unitTypeCode} · {r.bedrooms} BR / {r.bathrooms} BA · Floor {r.floorNumber} · {r.areaSqm} m² · ₱
                  {r.monthlyRent.toLocaleString()}/mo
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.reasons.map((reason) => (
                    <span key={reason} className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                      {reason}
                    </span>
                  ))}
                </div>
              </li>
            ))}
            <li className="pt-2">
              <Link
                href={`/units?maxRent=${budgetMax}`}
                className="text-sm font-medium text-emerald-600 hover:underline"
              >
                Browse all units within budget →
              </Link>
            </li>
          </ul>
        )}
      </section>
    </div>
  );
}
