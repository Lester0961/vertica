"use client";

import { useEffect, useState } from "react";

interface GatePassVisitor {
  id: string;
  visitorName: string;
  vehiclePlate: string | null;
}

interface GatePass {
  id: string;
  unitId: string;
  unitLabel: string;
  validFrom: string;
  validTo: string;
  status: string;
  maxUses: number;
  useCount: number;
  createdAt: string;
  visitors: GatePassVisitor[];
}

interface UnitOption {
  id: string;
  public_label: string;
}

export default function TenantGatePassesPage() {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [form, setForm] = useState({
    unitId: "",
    validFrom: "",
    validTo: "",
    maxUses: "1",
    visitors: [{ visitorName: "", vehiclePlate: "" }],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/gate-passes/mine").then((r) => r.json()),
      fetch("/api/v1/public/units").then((r) => r.json()),
    ]).then(([gpJson, uJson]) => {
      if (gpJson.ok) setPasses(gpJson.data.passes ?? []);
      if (uJson.ok) setUnits(uJson.data.units ?? []);
    }).finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/gate-passes/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: form.unitId,
          validFrom: form.validFrom,
          validTo: form.validTo,
          maxUses: parseInt(form.maxUses) || 1,
          visitors: form.visitors.filter((v) => v.visitorName.trim()),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message ?? "Failed to create gate pass.");
        return;
      }
      setNewCode(json.data.code);
      setShowCreate(false);
      setForm({ unitId: "", validFrom: "", validTo: "", maxUses: "1", visitors: [{ visitorName: "", vehiclePlate: "" }] });
      const gpRes = await fetch("/api/v1/gate-passes/mine");
      const gpJson = await gpRes.json();
      if (gpJson.ok) setPasses(gpJson.data.passes ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(passId: string) {
    if (!confirm("Revoke this gate pass?")) return;
    try {
      await fetch(`/api/v1/gate-passes/mine/${passId}/revoke`, { method: "POST" });
      setPasses((prev) => prev.map((p) => (p.id === passId ? { ...p, status: "REVOKED" } : p)));
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">My Gate Passes</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showCreate ? "Cancel" : "New Gate Pass"}
        </button>
      </div>

      {newCode && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="text-sm font-medium text-green-800">Gate pass created! Share this code with your visitor:</div>
          <div className="mt-2 font-mono text-3xl tracking-[0.3em] text-green-900">{newCode}</div>
          <button onClick={() => setNewCode(null)} className="mt-2 text-sm text-green-700 underline">Dismiss</button>
        </div>
      )}

      {showCreate && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700">Unit</label>
              <select
                value={form.unitId}
                onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">Select unit...</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.public_label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Max uses</label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Valid from</label>
              <input
                type="datetime-local"
                value={form.validFrom}
                onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Valid to</label>
              <input
                type="datetime-local"
                value={form.validTo}
                onChange={(e) => setForm({ ...form, validTo: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700">Visitors</label>
            {form.visitors.map((v, i) => (
              <div key={i} className="mt-2 flex gap-2">
                <input
                  placeholder="Visitor name"
                  value={v.visitorName}
                  onChange={(e) => {
                    const visitors = [...form.visitors];
                    visitors[i] = { visitorName: e.target.value, vehiclePlate: visitors[i]!.vehiclePlate };
                    setForm({ ...form, visitors });
                  }}
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Plate (optional)"
                  value={v.vehiclePlate}
                  onChange={(e) => {
                    const visitors = [...form.visitors];
                    visitors[i] = { visitorName: visitors[i]!.visitorName, vehiclePlate: e.target.value };
                    setForm({ ...form, visitors });
                  }}
                  className="w-32 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                {form.visitors.length > 1 && (
                  <button
                    onClick={() => setForm({ ...form, visitors: form.visitors.filter((_, j) => j !== i) })}
                    className="rounded-lg border border-neutral-200 px-2 text-sm text-neutral-500 hover:bg-neutral-50"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setForm({ ...form, visitors: [...form.visitors, { visitorName: "", vehiclePlate: "" }] })}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              + Add visitor
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={submitting || !form.unitId || !form.validFrom || !form.validTo || !form.visitors.some((v) => v.visitorName.trim())}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Gate Pass"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : passes.length === 0 ? (
        <p className="text-sm text-neutral-500">No gate passes yet.</p>
      ) : (
        <div className="space-y-3">
          {passes.map((p) => (
            <div key={p.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-neutral-900">Unit {p.unitLabel}</span>
                  <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                    p.status === "USED" ? "bg-blue-100 text-blue-700" :
                    p.status === "REVOKED" ? "bg-red-100 text-red-700" :
                    "bg-neutral-100 text-neutral-600"
                  }`}>
                    {p.status}
                  </span>
                </div>
                {p.status === "ACTIVE" && (
                  <button
                    onClick={() => handleRevoke(p.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Revoke
                  </button>
                )}
              </div>
              <div className="mt-2 text-sm text-neutral-500">
                {new Date(p.validFrom).toLocaleString()} – {new Date(p.validTo).toLocaleString()} · {p.useCount}/{p.maxUses} uses
              </div>
              {p.visitors.length > 0 && (
                <div className="mt-2 text-sm text-neutral-600">
                  Visitors: {p.visitors.map((v) => `${v.visitorName}${v.vehiclePlate ? ` (${v.vehiclePlate})` : ""}`).join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
