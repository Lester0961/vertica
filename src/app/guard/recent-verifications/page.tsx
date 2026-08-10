"use client";

import { useCallback, useEffect, useState } from "react";

interface Verification { id: string; result: string; denialReason: string | null; verifiedAt: string; eventType?: "ENTRY" | "EXIT" | null; unitLabel?: string | null; }

export default function GuardRecentVerificationsPage() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(async () => { try { const response = await fetch("/api/v1/gate-passes/verifications", { cache: "no-store" }); const json = await response.json(); if (!response.ok || !json.ok) throw new Error(); setVerifications(json.data.verifications ?? []); setState("ready"); } catch { setState("error"); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  return <div className="page-shell"><header className="page-header"><p className="eyebrow">Access log</p><h1>Recent verifications</h1><p>Successful entry and exit events appear with the unit they belong to.</p></header>{state === "loading" && <p className="text-sm text-neutral-500" role="status">Loading...</p>}{state === "error" && <div className="empty-state" role="alert">Verification history could not be loaded.</div>}{state === "ready" && !verifications.length && <div className="empty-state">No verifications yet.</div>}{state === "ready" && verifications.length > 0 && <div className="surface-card overflow-hidden"><table className="data-table data-table--responsive"><thead><tr><th>Time</th><th>Movement</th><th>Unit</th><th>Result</th><th>Reason</th></tr></thead><tbody>{verifications.map((verification) => <tr key={verification.id}><td data-label="Time">{new Date(verification.verifiedAt).toLocaleString()}</td><td data-label="Movement">{verification.eventType ?? "Not recorded"}</td><td data-label="Unit">{verification.unitLabel ?? "-"}</td><td data-label="Result"><span className={`status-chip status-chip--${verification.result === "VALID" ? "success" : verification.result === "NOT_FOUND" ? "neutral" : "danger"}`}>{verification.result}</span></td><td data-label="Reason">{verification.denialReason ?? "-"}</td></tr>)}</tbody></table></div>}</div>;
}
