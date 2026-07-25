"use client";

import { useEffect, useState } from "react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: string;
  priority: string;
  publishedAt: string | null;
  authorName: string | null;
  createdAt: string;
}

export default function TenantAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/announcements/active")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setAnnouncements(json.data.announcements ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-900">Announcements</h1>
      {loading ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-neutral-500">No announcements at this time.</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`rounded-xl border bg-white p-4 ${
                a.priority === "URGENT" ? "border-red-200" : "border-neutral-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-neutral-900">{a.title}</h3>
                {a.priority === "URGENT" && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">URGENT</span>
                )}
              </div>
              <p className="mt-2 text-sm text-neutral-600 whitespace-pre-wrap">{a.body}</p>
              <p className="mt-2 text-xs text-neutral-400">
                {a.authorName && `By ${a.authorName} · `}
                {a.publishedAt ? new Date(a.publishedAt).toLocaleString() : new Date(a.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
