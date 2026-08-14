"use client";

import { useState } from "react";

interface VerifyResult {
  result: string;
  denialReason?: string;
  pass?: {
    id: string;
    unitLabel: string;
    validFrom: string;
    validTo: string;
    useCount: number;
    maxUses: number;
    visitors: { visitorName: string; vehiclePlate: string | null }[];
  };
}

const RESULT_LABELS: Record<string, string> = {
  VALID: "Access granted",
  INVALID: "Access denied",
  EXPIRED: "Pass expired",
  REVOKED: "Pass revoked",
  NOT_FOUND: "Pass not found",
};

function isDenied(result: string) {
  return result !== "VALID";
}

export function GateVerifyForm() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventType, setEventType] = useState<"ENTRY" | "EXIT">("ENTRY");

  async function handleVerify() {
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/v1/gate-passes/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, eventType }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error?.message ?? "Verification failed.");
      setResult(json.data as VerifyResult);
    } catch (verifyError) {
      setError((verifyError as Error).message || "Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Gate operations</p>
        <h1>Verify visitor access</h1>
        <p>Enter the 6-digit code supplied by the resident, then record the visitor&apos;s entry or exit.</p>
      </header>

      <section className="surface-card mx-auto max-w-2xl p-5 sm:p-6">
        <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void handleVerify(); }}>
          <fieldset>
            <legend className="eyebrow mb-3">Movement</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["ENTRY", "EXIT"] as const).map((value) => (
                <button key={value} type="button" onClick={() => setEventType(value)} className={eventType === value ? "action-button" : "action-button action-button--secondary"}>
                  {value === "ENTRY" ? "Log entry" : "Log exit"}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="form-field" htmlFor="gate-pass-code">6-digit access code</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="gate-pass-code" className="guard-code-input" type="text" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus />
            <button type="submit" className="action-button" disabled={loading || code.length !== 6}>{loading ? "Checking..." : `Verify ${eventType.toLowerCase()}`}</button>
          </div>
        </form>

        {error && <p className="inline-feedback mt-5" data-tone="error" role="alert">{error}</p>}
        {result && (
          <section className="inline-feedback mt-5" data-tone={isDenied(result.result) ? "error" : undefined} aria-live="polite">
            <p className="eyebrow">Verification result</p>
            <h2 className="mt-2 text-lg font-bold">{RESULT_LABELS[result.result] ?? result.result}</h2>
            {result.result === "VALID" && <p className="mt-1 text-sm">{eventType === "ENTRY" ? "Entry recorded." : "Exit recorded."}</p>}
            {result.denialReason && <p className="mt-2 text-sm">{result.denialReason}</p>}
            {result.pass && (
              <div className="mt-4 grid gap-2 border-t border-current/15 pt-4 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><span>Residence</span><strong>{result.pass.unitLabel}</strong></div>
                <div className="flex flex-wrap justify-between gap-2"><span>Access window</span><strong>{new Date(result.pass.validFrom).toLocaleDateString()} to {new Date(result.pass.validTo).toLocaleDateString()}</strong></div>
                <div className="flex flex-wrap justify-between gap-2"><span>Entries used</span><strong>{result.pass.useCount}/{result.pass.maxUses}</strong></div>
                {result.pass.visitors.length > 0 && <div><span className="font-semibold">Visitors</span><p className="mt-1">{result.pass.visitors.map((visitor) => `${visitor.visitorName}${visitor.vehiclePlate ? ` (${visitor.vehiclePlate})` : ""}`).join(", ")}</p></div>}
              </div>
            )}
          </section>
        )}
      </section>
    </div>
  );
}
