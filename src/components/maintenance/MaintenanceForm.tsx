"use client";

import { useState } from "react";
import { Input } from "@/components/design-system/Input";

export function MaintenanceForm() {
  const [category, setCategory] = useState("PLUMBING");
  const [priority, setPriority] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [isSafety, setIsSafety] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/v1/maintenance/me/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          priority,
          description,
          isSafety,
          preferredSchedule: date || time ? { date, time } : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "SUCCESS") throw new Error(json.message ?? "Submission failed.");
      setDone("Request submitted — reference " + (json.data.requestId ?? "").slice(0, 8));
      setDescription("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6"
      onSubmit={submit}
    >
      <h2 className="text-lg font-semibold text-neutral-900">New maintenance request</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-600">Category</span>
          <select
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="PLUMBING">Plumbing</option>
            <option value="ELECTRICAL">Electrical</option>
            <option value="HVAC">HVAC / Climate</option>
            <option value="APPLIANCE">Appliance</option>
            <option value="STRUCTURAL">Structural</option>
            <option value="PEST">Pest control</option>
            <option value="OTHER">Other</option>
         </select>
       </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-600">Priority</span>
          <select
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
         </select>
       </label>
     </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-600">Description</span>
        <textarea
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue, location, and any access notes..."
          required
        />
     </label>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={isSafety}
          onChange={(e) => setIsSafety(e.target.checked)}
        />
        Safety hazard (electrical, gas, fire risk, etc.)
     </label>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Preferred date (optional)" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Preferred time (optional)" value={time} onChange={(e) => setTime(e.target.value)} />
     </div>

      <button
        type="submit"
        disabled={loading || description.length < 10}
        className="w-full rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "Submitting…" : "Submit request"}
     </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
          {done}
       </p>
      )}
   </form>
  );
}
