"use client";

import { useEffect, useState } from "react";

interface AuditLog {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  beforeData: unknown;
  afterData: unknown;
  source: string | null;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/audit-logs")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.ok) setLogs(json.data.logs ?? []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-900">Audit Logs</h1>
      <p className="text-sm text-neutral-500">Read-only system audit trail. Last 200 events.</p>
      {loading ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-neutral-500">No audit logs found.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-2 font-medium text-neutral-600">Time</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Action</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Entity</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Actor</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {logs.map((log) => (
                <>
                  <tr key={log.id} className="cursor-pointer hover:bg-neutral-50" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                    <td className="px-4 py-2 text-neutral-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">{log.action}</span>
                    </td>
                    <td className="px-4 py-2 font-medium text-neutral-800">{log.entity}</td>
                    <td className="px-4 py-2 text-neutral-500">{log.actorRole ?? "system"}</td>
                    <td className="px-4 py-2 text-neutral-400">{expandedId === log.id ? "▼" : "▶"}</td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={`${log.id}-detail`}>
                      <td colSpan={5} className="px-4 py-3 bg-neutral-50">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {log.entityId && <div><span className="text-neutral-500">Entity ID:</span> <span className="font-mono">{log.entityId}</span></div>}
                          {log.source && <div><span className="text-neutral-500">Source:</span> {log.source}</div>}
                          {!!log.beforeData && (
                            <div>
                              <span className="text-neutral-500">Before:</span>
                              <pre className="mt-1 overflow-x-auto rounded bg-neutral-100 p-2 font-mono text-xs">{JSON.stringify(log.beforeData as Record<string, unknown>, null, 2)}</pre>
                            </div>
                          )}
                          {!!log.afterData && (
                            <div>
                              <span className="text-neutral-500">After:</span>
                              <pre className="mt-1 overflow-x-auto rounded bg-neutral-100 p-2 font-mono text-xs">{JSON.stringify(log.afterData as Record<string, unknown>, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
