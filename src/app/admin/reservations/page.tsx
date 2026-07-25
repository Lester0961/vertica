"use client";

export default function AdminReservationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-900">Reservations</h1>
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        Reservation management is available through the <a href="/admin/inquiries" className="text-blue-600 hover:underline">Inquiries</a> pipeline.
      </div>
    </div>
  );
}
