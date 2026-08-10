"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ComparePicker({ options, initial }: { options: { publicLabel: string; unitTypeName: string }[]; initial: string[] }) {
  const router = useRouter();
  const [labels, setLabels] = useState([initial[0] ?? "", initial[1] ?? "", initial[2] ?? ""]);
  function update(index: number, value: string) { setLabels((current) => current.map((label, itemIndex) => itemIndex === index ? value : label)); }
  function compare() { const selected = labels.filter(Boolean); router.push(selected.length ? `/compare?labels=${encodeURIComponent(selected.join(","))}` : "/compare"); }
  return <div className="surface-card mt-6 p-5"><div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">{labels.map((label, index) => <label key={index} className="text-sm font-semibold">Unit {index + 1}<select value={label} onChange={(event) => update(index, event.target.value)} className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2"><option value="">Select a unit</option>{options.filter((option) => !labels.includes(option.publicLabel) || option.publicLabel === label).map((option) => <option key={option.publicLabel} value={option.publicLabel}>{option.publicLabel} · {option.unitTypeName}</option>)}</select></label>)}<button onClick={compare} disabled={!labels.some(Boolean)} className="self-end rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Compare</button></div></div>;
}
