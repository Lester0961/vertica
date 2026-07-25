"use client";

import { useEffect, useState } from "react";

export default function AdminClientsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-900">Clients</h1>
      <p className="text-sm text-neutral-500">Client records are managed through the CRM pipeline.</p>
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        Use <a href="/admin/inquiries" className="text-blue-600 hover:underline">Inquiries</a> to view and manage client interactions.
      </div>
    </div>
  );
}
