"use client";

import { useEffect, useState } from "react";

interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  status: string;
  roles: string[];
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  PROPERTY_ADMIN: "bg-blue-100 text-blue-700",
  TENANT: "bg-green-100 text-green-700",
  GUARD: "bg-amber-100 text-amber-700",
  MAINTENANCE: "bg-orange-100 text-orange-700",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/users")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.ok) setUsers(json.data.users ?? []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-900">User Management</h1>
      {loading ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-neutral-500">No users found.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-2 font-medium text-neutral-600">Email</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Name</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Phone</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Roles</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Status</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 font-medium text-neutral-900">{u.email}</td>
                  <td className="px-4 py-2 text-neutral-600">{u.displayName ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-500">{u.phone ?? "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r} className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[r] ?? "bg-neutral-100 text-neutral-600"}`}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                      u.status === "INVITED" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
