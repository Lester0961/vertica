"use client";

import { useEffect, useState } from "react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: string;
  priority: string;
  publishedAt: string | null;
  expiresAt: string | null;
  authorName: string | null;
  createdAt: string;
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "ALL" as "ALL" | "TENANTS" | "STAFF",
    priority: "NORMAL" as "NORMAL" | "URGENT",
    publishNow: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/announcements")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setAnnouncements(json.data.announcements ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          audience: form.audience,
          priority: form.priority,
          publishedAt: form.publishNow ? new Date().toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message ?? "Failed to create announcement.");
        return;
      }
      setShowCreate(false);
      setForm({ title: "", body: "", audience: "ALL", priority: "NORMAL", publishNow: true });
      const listRes = await fetch("/api/v1/announcements");
      const listJson = await listRes.json();
      if (listJson.ok) setAnnouncements(listJson.data.announcements ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish(id: string) {
    await fetch(`/api/v1/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publishedAt: new Date().toISOString() }),
    });
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, publishedAt: new Date().toISOString() } : a))
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/v1/announcements/${id}`, { method: "DELETE" });
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Announcements</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showCreate ? "Cancel" : "New Announcement"}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Announcement title..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4}
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Announcement content..."
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700">Audience</label>
              <select
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value as "ALL" | "TENANTS" | "STAFF" })}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="ALL">All</option>
                <option value="TENANTS">Tenants only</option>
                <option value="STAFF">Staff only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as "NORMAL" | "URGENT" })}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.publishNow}
                  onChange={(e) => setForm({ ...form, publishNow: e.target.checked })}
                  className="rounded"
                />
                Publish now
              </label>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={submitting || !form.title.trim() || !form.body.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Announcement"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-neutral-500">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-neutral-900">{a.title}</h3>
                    {a.priority === "URGENT" && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">URGENT</span>
                    )}
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">{a.audience}</span>
                    {a.publishedAt ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Published</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Draft</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-neutral-600 line-clamp-2">{a.body}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    by {a.authorName ?? "Unknown"} · {new Date(a.createdAt).toLocaleString()}
                    {a.publishedAt && ` · Published ${new Date(a.publishedAt).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  {!a.publishedAt && (
                    <button
                      onClick={() => handlePublish(a.id)}
                      className="text-sm text-green-600 hover:underline"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
