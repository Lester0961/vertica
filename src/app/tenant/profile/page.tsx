"use client";

import { useEffect, useState } from "react";

interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  status: string;
  roles: string[];
  createdAt: string;
}

export default function TenantProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/profile/me")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.ok) {
          const p = json.data as Profile;
          setProfile(p);
          setForm({ displayName: p.displayName ?? "", phone: p.phone ?? "" });
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/v1/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.ok) {
        setProfile((p) => p ? { ...p, displayName: form.displayName, phone: form.phone } : p);
        setEditing(false);
        setMsg("Profile updated.");
      } else {
        setMsg("Failed to update.");
      }
    } catch {
      setMsg("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-neutral-500">Loading...</p>;
  if (!profile) return <p className="text-sm text-neutral-500">Profile not found.</p>;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">My Profile</h1>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Email</label>
          <div className="mt-1 text-sm text-neutral-900">{profile.email}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Roles</label>
          <div className="mt-1 flex gap-1">
            {profile.roles.map((r) => (
              <span key={r} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{r}</span>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Status</label>
          <div className="mt-1 text-sm text-neutral-900">{profile.status}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Member since</label>
          <div className="mt-1 text-sm text-neutral-900">{new Date(profile.createdAt).toLocaleDateString()}</div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-neutral-900">Personal Info</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:underline">Edit</button>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Display name</label>
          {editing ? (
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          ) : (
            <div className="mt-1 text-sm text-neutral-900">{profile.displayName ?? "—"}</div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Phone</label>
          {editing ? (
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          ) : (
            <div className="mt-1 text-sm text-neutral-900">{profile.phone ?? "—"}</div>
          )}
        </div>
        {editing && (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => { setEditing(false); setForm({ displayName: profile.displayName ?? "", phone: profile.phone ?? "" }); }} className="text-sm text-neutral-500 hover:underline">Cancel</button>
          </div>
        )}
        {msg && <p className="text-sm text-green-600">{msg}</p>}
      </div>
    </div>
  );
}
