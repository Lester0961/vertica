"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/design-system/Input";

const PRIORITY_OPTIONS = [
  ["low_rent", "Lower rent"],
  ["near_elevator", "Near elevator"],
  ["quiet", "Quiet location"],
  ["city_view", "City view"],
  ["furnished", "Furnished"],
  ["natural_light", "Natural light"],
  ["parking", "Parking"],
  ["gym_access", "Gym access"],
  ["workspace", "Workspace"],
  ["balcony", "Balcony"],
] as const;

interface Recommendation {
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
  const [minArea, setMinArea] = useState("");
  const [furnishing, setFurnishing] = useState("ANY");
  const [floorPreference, setFloorPreference] = useState("ANY");
  const [accessibilityRequired, setAccessibilityRequired] = useState(false);
  const [pets, setPets] = useState(false);
  const [priorities, setPriorities] = useState<string[]>(["low_rent"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [eligibleCount, setEligibleCount] = useState(0);

  const togglePriority = (priority: string) => {
    setPriorities((current) => {
      if (current.includes(priority)) return current.filter((item) => item !== priority);
      if (current.length >= 3) {
        setError("Choose up to three priorities. Deselect one before adding another.");
        return current;
      }
      setError(null);
      return [...current, priority];
    });
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/recommendations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          budgetMax: Number(budgetMax),
          householdSize: Number(householdSize),
          preferredBedrooms: bedrooms === "" ? undefined : Number(bedrooms),
          moveInBy: moveInBy || undefined,
          minArea: minArea ? Number(minArea) : undefined,
          furnishing,
          floorPreference,
          accessibilityRequired,
          pets,
          priorities,
        }),
      });
      const json = await response.json();
      if (!response.ok || json.status !== "SUCCESS") {
        throw new Error(json.message ?? "Recommendation failed.");
      }
      setResults(json.data.recommendations);
      setEligibleCount(json.data.eligibleCount ?? json.data.recommendations.length);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <form
        className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">10-question unit matcher</h2>
          <p className="mt-1 text-sm text-neutral-600">Hard requirements filter first. Your ranked priorities then score and diversify the top three.</p>
        </div>

        <Input label="1. Maximum monthly rent (PHP)" type="number" min="1" inputMode="numeric" value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} required />
        <Input label="2. Household size" type="number" min="1" max="20" inputMode="numeric" value={householdSize} onChange={(event) => setHouseholdSize(event.target.value)} required />

        <label className="block text-sm font-medium text-neutral-700">
          3. Required bedroom count
          <select className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2" value={bedrooms} onChange={(event) => setBedrooms(event.target.value)}>
            <option value="">Any</option><option value="0">Studio</option><option value="1">1 bedroom</option><option value="2">2 bedrooms</option>
          </select>
        </label>

        <Input label="4. Move-in deadline (optional)" type="date" value={moveInBy} onChange={(event) => setMoveInBy(event.target.value)} />
        <Input label="5. Minimum floor area in m² (optional)" type="number" min="1" step="0.1" value={minArea} onChange={(event) => setMinArea(event.target.value)} />

        <label className="block text-sm font-medium text-neutral-700">
          6. Required furnishing
          <select className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2" value={furnishing} onChange={(event) => setFurnishing(event.target.value)}>
            <option value="ANY">Any</option><option value="UNFURNISHED">Unfurnished</option><option value="SEMI_FURNISHED">Semi-furnished</option><option value="FULLY_FURNISHED">Fully furnished</option>
          </select>
        </label>

        <label className="block text-sm font-medium text-neutral-700">
          7. Floor preference
          <select className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2" value={floorPreference} onChange={(event) => setFloorPreference(event.target.value)}>
            <option value="ANY">Any floor</option><option value="LOW">Lower floors</option><option value="MID">Middle floors</option><option value="HIGH">Higher floors</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={accessibilityRequired} onChange={(event) => setAccessibilityRequired(event.target.checked)} />
          8. I require a verified step-free accessible unit
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={pets} onChange={(event) => setPets(event.target.checked)} />
          9. I need a pet-friendly unit
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-neutral-700">10. Rank up to three priorities ({priorities.length}/3)</legend>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map(([value, label], index) => {
              const rank = priorities.indexOf(value);
              return (
                <button key={value} type="button" aria-pressed={rank >= 0} onClick={() => togglePriority(value)} className={`rounded-full border px-3 py-1.5 text-sm ${rank >= 0 ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"}`}>
                  {rank >= 0 ? `${rank + 1}. ${label}` : label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {loading ? "Finding your matches…" : "Get top 3 recommendations"}
        </button>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </form>

      <section aria-live="polite">
        {results === null ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-neutral-500">Your top three matches will appear here.</div>
        ) : results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-neutral-500">No units meet every hard requirement. Adjust a required answer and try again.</div>
        ) : (
          <div>
            <p className="mb-3 text-sm text-neutral-600">Showing {results.length} diversified match{results.length === 1 ? "" : "es"} from {eligibleCount} eligible unit{eligibleCount === 1 ? "" : "s"}.</p>
            <ol className="space-y-3">
              {results.map((result, index) => (
                <li key={result.publicLabel} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <Link href={`/units/${encodeURIComponent(result.publicLabel)}`} className="font-semibold text-neutral-900 hover:underline">{index + 1}. {result.publicLabel}</Link>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{result.score}% match</span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">{result.unitTypeCode} · {result.bedrooms} BR / {result.bathrooms} BA · Floor {result.floorNumber} · {result.areaSqm} m² · PHP {result.monthlyRent.toLocaleString()}/mo</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{result.reasons.map((reason) => <span key={reason} className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{reason}</span>)}</div>
                </li>
              ))}
              <li className="pt-2"><Link href={`/units?maxRent=${budgetMax}`} className="text-sm font-medium text-emerald-600 hover:underline">Browse all units within budget →</Link></li>
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}
