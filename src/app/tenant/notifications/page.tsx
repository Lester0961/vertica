"use client";

import { useEffect, useState } from "react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  targetUrl: string | null;
  channel: string;
  createdAt: string;
  readAt: string | null;
}

export default function TenantNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/notifications/me")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.ok) setNotifications(json.data.notifications ?? []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleMarkRead(id: string) {
    await fetch(`/api/v1/notifications/me/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
  }

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Notifications</h1>
        {unread > 0 && <span className="text-sm text-neutral-500">{unread} unread</span>}
      </div>
      {loading ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-neutral-500">No notifications.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 ${
                n.readAt ? "border-neutral-200 bg-white" : "border-blue-200 bg-blue-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-medium ${n.readAt ? "text-neutral-700" : "text-neutral-900"}`}>{n.title}</h3>
                    {!n.readAt && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                  </div>
                  {n.body && <p className="mt-1 text-sm text-neutral-500">{n.body}</p>}
                  <p className="mt-1 text-xs text-neutral-400">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.readAt && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="ml-4 text-xs text-blue-600 hover:underline"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
