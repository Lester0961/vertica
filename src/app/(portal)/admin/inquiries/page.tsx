import { requirePageRole } from "@/lib/security/guard";
import { getInquiries } from "@/features/staff/queries";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  await requirePageRole(["SUPER_ADMIN", "PROPERTY_ADMIN"]);
  const inquiries = await getInquiries();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Inquiries</h1>
      <p className="mt-1 text-neutral-600">Recent prospect inquiries and their status.</p>

      <div className="mt-6 space-y-3">
        {inquiries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-neutral-500">No inquiries yet.</p>
        ) : (
          inquiries.map((i) => (
            <div key={i.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-900">{i.fullName ?? "Anonymous"}</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                  {i.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-neutral-600">
                {i.email ?? "—"} · {i.phone ?? "—"}
              </p>
              {i.summary && <p className="mt-1 text-sm text-neutral-500">{i.summary}</p>}
              {i.unitLabels.length > 0 && (
                <p className="mt-1 text-xs text-neutral-500">Interested in: {i.unitLabels.join(", ")}</p>
              )}
              <p className="mt-1 text-xs text-neutral-400">{new Date(i.createdAt).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
