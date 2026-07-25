"use client";



export default function TenantDashboardPage() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">{greeting}</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <a href="/tenant/bills" className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition">
          <div className="text-sm font-medium text-neutral-900">Bills & Payments</div>
          <div className="mt-1 text-xs text-neutral-500">View outstanding balance and payment history</div>
        </a>
        <a href="/tenant/maintenance" className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition">
          <div className="text-sm font-medium text-neutral-900">Maintenance</div>
          <div className="mt-1 text-xs text-neutral-500">Submit and track service requests</div>
        </a>
        <a href="/tenant/gate-passes" className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition">
          <div className="text-sm font-medium text-neutral-900">Gate Passes</div>
          <div className="mt-1 text-xs text-neutral-500">Create and manage visitor access</div>
        </a>
        <a href="/tenant/announcements" className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition">
          <div className="text-sm font-medium text-neutral-900">Announcements</div>
          <div className="mt-1 text-xs text-neutral-500">Community updates and notices</div>
        </a>
        <a href="/tenant/profile" className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition">
          <div className="text-sm font-medium text-neutral-900">My Profile</div>
          <div className="mt-1 text-xs text-neutral-500">Update your personal information</div>
        </a>
        <a href="/tenant/notifications" className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition">
          <div className="text-sm font-medium text-neutral-900">Notifications</div>
          <div className="mt-1 text-xs text-neutral-500">View alerts and messages</div>
        </a>
      </div>
    </div>
  );
}
