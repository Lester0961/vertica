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

const RESULT_STYLES: Record<string, string> = {
  VALID: "bg-green-50 border-green-200 text-green-800",
  INVALID: "bg-red-50 border-red-200 text-red-800",
  EXPIRED: "bg-amber-50 border-amber-200 text-amber-800",
  REVOKED: "bg-red-50 border-red-200 text-red-800",
  NOT_FOUND: "bg-neutral-50 border-neutral-200 text-neutral-700",
};

const RESULT_LABELS: Record<string, string> = {
  VALID: "Access Granted",
  INVALID: "Access Denied",
  EXPIRED: "Pass Expired",
  REVOKED: "Pass Revoked",
  NOT_FOUND: "Pass Not Found",
};

export function GateVerifyForm() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/v1/gate-passes/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message ?? "Verification failed.");
        return;
      }
      setResult(json.data as VerifyResult);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Verify Gate Pass</h1>
        <p className="mt-1 text-sm text-neutral-500">Enter the 6-digit code from the visitor.</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          pattern="[0-9]{6}"
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] text-neutral-900 placeholder:text-neutral-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          autoFocus
        />
        <button
          onClick={handleVerify}
          disabled={loading || code.length !== 6}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Checking..." : "Verify"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className={`rounded-lg border p-4 ${RESULT_STYLES[result.result] ?? "bg-neutral-50 border-neutral-200"}`}>
          <div className="text-lg font-semibold">{RESULT_LABELS[result.result] ?? result.result}</div>
          {result.denialReason && <p className="mt-1 text-sm opacity-80">{result.denialReason}</p>}
          {result.pass && (
            <div className="mt-3 space-y-1 text-sm">
              <div>Unit: <span className="font-medium">{result.pass.unitLabel}</span></div>
              <div>Valid: {new Date(result.pass.validFrom).toLocaleDateString()} – {new Date(result.pass.validTo).toLocaleDateString()}</div>
              <div>Uses: {result.pass.useCount}/{result.pass.maxUses}</div>
              {result.pass.visitors.length > 0 && (
                <div className="mt-2">
                  <div className="font-medium">Visitors:</div>
                  {result.pass.visitors.map((v, i) => (
                    <div key={i} className="ml-2">
                      {v.visitorName}{v.vehiclePlate ? ` (${v.vehiclePlate})` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
