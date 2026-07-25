"use client";

import { useState } from "react";
import { Input } from "@/components/design-system/Input";

interface BillOption {
  id: string;
  label: string;
  balance: number;
}

export function PaymentForm({ bills }: { bills: BillOption[] }) {
  const [billId, setBillId] = useState(bills[0]?.id ?? "");
  const [amount, setAmount] = useState(bills[0]?.balance ? String(bills[0].balance) : "");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/v1/billing/me/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          billId: billId || null,
          amount: Number(amount),
          method,
          externalReference: reference || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "SUCCESS") throw new Error(json.message ?? "Submission failed.");
      setDone("Payment submitted for review. Reference: " + (json.data.paymentId ?? "").slice(0, 8));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (bills.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-neutral-500">
        You have no outstanding bills.
      </p>
    );
  }

  return (
    <form className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6" onSubmit={submit}>
      <h2 className="text-lg font-semibold text-neutral-900">Submit a payment</h2>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-600">Bill</span>
        <select
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          value={billId}
          onChange={(e) => setBillId(e.target.value)}
        >
          {bills.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label} — ₱{b.balance.toLocaleString()} due
            </option>
          ))}
        </select>
      </label>
      <Input label="Amount (₱)" type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-600">Method</span>
        <select
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="BANK_TRANSFER">Bank transfer</option>
          <option value="GCASH">GCash</option>
          <option value="PAYMAYA">PayMaya</option>
          <option value="CARD">Card</option>
          <option value="OVER_THE_COUNTER">Over the counter</option>
          <option value="OTHER">Other</option>
        </select>
      </label>
      <Input label="External reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "Submitting…" : "Submit payment"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{done}</p>}
    </form>
  );
}
