import { requirePageRole } from "@/lib/security/guard";
import { getMyBills, getMyPayments } from "@/features/billing/queries";
import { PaymentForm } from "@/components/billing/PaymentForm";
import { formatPeso } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function TenantBillsPage() {
  await requirePageRole(["TENANT"]);
  const [bills, payments] = await Promise.all([getMyBills(), getMyPayments()]);

  const billOptions = bills.map((b) => ({
    id: b.id,
    label: `${b.periodStart} → ${b.periodEnd}`,
    balance: b.balance,
  }));

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Bills &amp; payments</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Outstanding bills</h2>
          {bills.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-neutral-500">
              No outstanding bills.
            </p>
          ) : (
            <ul className="space-y-2">
              {bills.map((b) => (
                <li key={b.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900">
                      {b.periodStart} → {b.periodEnd}
                    </span>
                    <span className="text-sm text-neutral-600">{b.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">Balance: {formatPeso(b.balance)}</p>
                  {b.items.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-neutral-500">
                      {b.items.map((i, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{i.description}</span>
                          <span>{formatPeso(i.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-neutral-500">Payment history</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-neutral-500">No payments submitted yet.</p>
          ) : (
            <ul className="space-y-1">
              {payments.map((p) => (
                <li key={p.id} className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                  {formatPeso(p.submittedAmount)} via {p.method} —{" "}
                  <span className="font-medium">{p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <PaymentForm bills={billOptions} />
        </section>
      </div>
    </div>
  );
}
