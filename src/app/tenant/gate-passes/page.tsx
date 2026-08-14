"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtimeTables } from "@/components/realtime/RealtimeRefresh";

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
  visitors: GatePassVisitor[];
}

interface UnitOption {
  id: string;
  publicLabel: string;
}

type GatePassForm = {
  unitId: string;
  validFrom: string;
  validTo: string;
  maxUses: string;
  visitors: { visitorName: string; vehiclePlate: string }[];
};

function localDateTimeValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoTimestamp(value: string) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : value;
}

function statusTone(status: string) {
  if (status === "ACTIVE") return "success";
  if (status === "REVOKED") return "danger";
  if (status === "EXPIRED") return "warning";
  return "neutral";
}

export default function TenantGatePassesPage() {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [form, setForm] = useState<GatePassForm>({ unitId: "", validFrom: "", validTo: "", maxUses: "1", visitors: [{ visitorName: "", vehiclePlate: "" }] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [passResponse, leaseResponse] = await Promise.all([
        fetch("/api/v1/gate-passes/mine", { cache: "no-store" }),
        fetch("/api/v1/leases/me", { cache: "no-store" }),
      ]);
      const [passJson, leaseJson] = await Promise.all([passResponse.json(), leaseResponse.json()]);
      if (!passResponse.ok || !passJson.ok || !leaseResponse.ok || !leaseJson.ok) throw new Error("Gate-pass data could not be loaded.");
      setPasses(passJson.data.passes ?? []);
      const lease = leaseJson.data.lease;
      if (lease?.unitId) {
        const leasedUnit = { id: lease.unitId, publicLabel: lease.publicLabel };
        setUnits([leasedUnit]);
        setForm((current) => ({ ...current, unitId: current.unitId || leasedUnit.id }));
      } else {
        setUnits([]);
      }
      setError(null);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useRealtimeTables(["gate_passes"], load);

  function openCreate() {
    const start = new Date();
    start.setSeconds(0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    setForm({
      unitId: units[0]?.id ?? "",
      validFrom: localDateTimeValue(start),
      validTo: localDateTimeValue(end),
      maxUses: "1",
      visitors: [{ visitorName: "", vehiclePlate: "" }],
    });
    setError(null);
    setShowCreate(true);
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/gate-passes/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: form.unitId,
          validFrom: toIsoTimestamp(form.validFrom),
          validTo: toIsoTimestamp(form.validTo),
          maxUses: Number(form.maxUses) || 1,
          visitors: form.visitors.filter((visitor) => visitor.visitorName.trim()),
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error?.message ?? "Gate pass could not be created.");
      setNewCode(json.data.code);
      setShowCreate(false);
      await load();
    } catch (createError) {
      setError((createError as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(passId: string) {
    if (!confirm("Revoke this gate pass?")) return;
    setError(null);
    try {
      const response = await fetch(`/api/v1/gate-passes/mine/${passId}/revoke`, { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error?.message ?? "Gate pass could not be revoked.");
      setPasses((current) => current.map((pass) => pass.id === passId ? { ...pass, status: "REVOKED" } : pass));
    } catch (revokeError) {
      setError((revokeError as Error).message);
    }
  }

  return (
    <div className="page-shell">
      <header className="page-header flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Visitor access</p>
          <h1>Gate passes</h1>
          <p>Create time-bound visitor access for your leased residence. Codes are shown once and verified securely at the gate.</p>
        </div>
        <button type="button" className="action-button" disabled={loading || units.length === 0} onClick={openCreate}>New gate pass</button>
      </header>

      {error && <p className="inline-feedback mb-4" data-tone="error" role="alert">{error}</p>}
      {newCode && (
        <section className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900" role="status">
          <p className="eyebrow text-emerald-800">Gate pass created</p>
          <h2 className="mt-2 text-base font-bold">Share this code with your visitor now.</h2>
          <p className="mt-1 text-sm text-emerald-800">For security, Vertica stores only a cryptographic hash and will not show this code again.</p>
          <div className="mt-4 font-mono text-3xl font-bold tracking-[0.28em]">{newCode}</div>
          <button type="button" className="mt-4 text-sm font-semibold underline underline-offset-4" onClick={() => setNewCode(null)}>I have saved the code</button>
        </section>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="surface-card mb-5 p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div><p className="eyebrow">New access window</p><h2 className="mt-1 text-lg font-bold">Set visitor details</h2></div>
            <button type="button" className="action-button action-button--secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="form-field">Unit
              <select value={form.unitId} onChange={(event) => setForm((current) => ({ ...current, unitId: event.target.value }))} required>
                <option value="">Select unit</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.publicLabel}</option>)}
              </select>
            </label>
            <label className="form-field">Maximum entries
              <input type="number" min={1} max={100} value={form.maxUses} onChange={(event) => setForm((current) => ({ ...current, maxUses: event.target.value }))} required />
            </label>
            <label className="form-field">Valid from
              <input type="datetime-local" value={form.validFrom} onChange={(event) => setForm((current) => ({ ...current, validFrom: event.target.value }))} required />
            </label>
            <label className="form-field">Valid to
              <input type="datetime-local" value={form.validTo} onChange={(event) => setForm((current) => ({ ...current, validTo: event.target.value }))} required />
            </label>
          </div>

          <div className="mt-5">
            <p className="eyebrow">Visitors</p>
            <div className="mt-3 grid gap-3">
              {form.visitors.map((visitor, index) => (
                <div key={index} className="grid gap-3 sm:grid-cols-[1fr_11rem_auto]">
                  <label className="sr-only" htmlFor={`visitor-name-${index}`}>Visitor {index + 1} name</label>
                  <input id={`visitor-name-${index}`} required={index === 0} placeholder="Visitor name" value={visitor.visitorName} onChange={(event) => setForm((current) => ({ ...current, visitors: current.visitors.map((item, itemIndex) => itemIndex === index ? { ...item, visitorName: event.target.value } : item) }))} />
                  <label className="sr-only" htmlFor={`visitor-plate-${index}`}>Visitor {index + 1} plate</label>
                  <input id={`visitor-plate-${index}`} placeholder="Vehicle plate (optional)" value={visitor.vehiclePlate} onChange={(event) => setForm((current) => ({ ...current, visitors: current.visitors.map((item, itemIndex) => itemIndex === index ? { ...item, vehiclePlate: event.target.value } : item) }))} />
                  {form.visitors.length > 1 && <button type="button" className="action-button action-button--secondary" onClick={() => setForm((current) => ({ ...current, visitors: current.visitors.filter((_, itemIndex) => itemIndex !== index) }))}>Remove</button>}
                </div>
              ))}
            </div>
            <button type="button" className="mt-3 text-sm font-semibold text-emerald-800 underline underline-offset-4" onClick={() => setForm((current) => ({ ...current, visitors: [...current.visitors, { visitorName: "", vehiclePlate: "" }] }))}>Add another visitor</button>
          </div>
          <div className="form-actions mt-6"><button className="action-button" disabled={submitting}>{submitting ? "Creating..." : "Create gate pass"}</button></div>
        </form>
      )}

      {loading ? <p className="text-sm text-neutral-500" role="status">Loading visitor access...</p> : passes.length === 0 ? <div className="empty-state">No gate passes have been created yet.</div> : (
        <div className="grid gap-3">
          {passes.map((pass) => (
            <article key={pass.id} className="surface-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="eyebrow">{pass.unitLabel}</p><h2 className="mt-1 text-base font-bold">Visitor access window</h2></div>
                <span className={`status-chip status-chip--${statusTone(pass.status)}`}>{pass.status}</span>
              </div>
              <p className="mt-3 text-sm text-neutral-700">{new Date(pass.validFrom).toLocaleString()} to {new Date(pass.validTo).toLocaleString()}</p>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-600"><span>{pass.useCount}/{pass.maxUses} entries used</span><span>{pass.visitors.map((visitor) => `${visitor.visitorName}${visitor.vehiclePlate ? ` (${visitor.vehiclePlate})` : ""}`).join(", ") || "No visitor recorded"}</span></div>
              {pass.status === "ACTIVE" && <button type="button" className="mt-4 text-sm font-semibold text-red-700 underline underline-offset-4" onClick={() => void handleRevoke(pass.id)}>Revoke access</button>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
