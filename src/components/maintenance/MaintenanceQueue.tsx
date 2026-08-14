"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/design-system/Modal";
import { useRealtimeTables } from "@/components/realtime/RealtimeRefresh";

type Request = {
  id: string;
  unitLabel: string;
  tenantName: string | null;
  category: string;
  priority: string;
  description: string;
  status: string;
  isSafety: boolean;
  createdAt: string;
  resolution: string | null;
};

const TERMINAL_STATUSES = ["CLOSED", "COMPLETED", "CANCELLED", "REJECTED"];

function nextStatuses(status: string): string[] {
  if (status === "ON_HOLD") return ["IN_PROGRESS", "COMPLETED"];
  if (status === "IN_PROGRESS") return ["ON_HOLD", "COMPLETED"];
  return ["IN_PROGRESS", "ON_HOLD", "COMPLETED"];
}

function initialNextStatus(status: string) {
  return status === "ON_HOLD" ? "IN_PROGRESS" : status === "IN_PROGRESS" ? "COMPLETED" : "IN_PROGRESS";
}

function statusTone(request: Request) {
  if (request.isSafety) return "danger";
  if (request.status === "ON_HOLD") return "warning";
  return "success";
}

export function MaintenanceQueue({ initialRequests }: { initialRequests: Request[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [active, setActive] = useState<Request | null>(null);
  const [nextStatus, setNextStatus] = useState("IN_PROGRESS");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/maintenance/requests", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error("Maintenance requests could not be refreshed.");
      setRequests(json.data.requests ?? []);
      setError(null);
    } catch (refreshError) {
      setError((refreshError as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useRealtimeTables(["maintenance_requests"], load);

  const openRequests = useMemo(
    () => requests.filter((request) => !TERMINAL_STATUSES.includes(request.status)),
    [requests],
  );

  useEffect(() => {
    if (!active) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [active]);

  function beginUpdate(request: Request) {
    setActive(request);
    setNextStatus(initialNextStatus(request.status));
    setReason("");
    setError(null);
  }

  async function updateStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/maintenance/requests/${active.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus, reason }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error?.message ?? "Work status could not be saved.");
      setRequests((current) => current.map((request) => request.id === active.id
        ? { ...request, status: json.data.request.status, resolution: json.data.request.resolution }
        : request));
      setMessage(`${active.unitLabel} moved to ${json.data.request.status.replaceAll("_", " ")}.`);
      setActive(null);
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Service operations</p>
        <h1>Maintenance queue</h1>
        <p>{openRequests.length} open request{openRequests.length === 1 ? "" : "s"}. Start work, place a task on hold, or record a completed resolution.</p>
      </header>

      {message && <p className="inline-feedback mb-4" role="status">{message}</p>}
      {error && <p className="inline-feedback mb-4" data-tone="error" role="alert">{error}</p>}
      {loading && <p className="mb-4 text-sm text-neutral-500" role="status">Refreshing service queue...</p>}

      {openRequests.length === 0 ? (
        <div className="empty-state">No open requests are assigned to the service queue.</div>
      ) : (
        <div className="grid gap-3">
          {openRequests.map((request) => (
            <article key={request.id} className="surface-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">{request.unitLabel} · {request.category}</p>
                  <h2 className="mt-1 text-base font-bold">{request.tenantName ?? "Resident"}</h2>
                </div>
                <span className={`status-chip status-chip--${statusTone(request)}`}>
                  {request.isSafety ? "Safety issue" : request.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-3 text-sm text-neutral-700">{request.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-500">
                <span>{request.priority} priority</span>
                <span>Submitted {new Date(request.createdAt).toLocaleString()}</span>
                <button type="button" className="ml-auto text-sm font-semibold text-emerald-800 underline underline-offset-4" onClick={() => beginUpdate(request)}>Update work status</button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={`Update ${active?.unitLabel ?? "maintenance"} work`}
        description="Record the next service state and a short operational note. The resident and administration portal update in real time."
      >
        <form className="form-stack" onSubmit={updateStatus}>
          <label className="form-field">
            Work status
            <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
              {nextStatuses(active?.status ?? "SUBMITTED").map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label className="form-field">
            {nextStatus === "COMPLETED" ? "Resolution" : "Service note"}
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} required placeholder={nextStatus === "COMPLETED" ? "Describe the completed repair." : "Describe the next action or delay."} />
          </label>
          <div className="form-actions">
            <button type="button" className="action-button action-button--secondary" onClick={() => setActive(null)}>Cancel</button>
            <button className="action-button" disabled={saving}>{saving ? "Saving..." : "Save work status"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
