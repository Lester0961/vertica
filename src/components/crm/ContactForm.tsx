"use client";

import { useState } from "react";
import { Input } from "@/components/design-system/Input";

export type CrmKind = "inquiry" | "viewing" | "reservation";

const ENDPOINT: Record<CrmKind, string> = {
  inquiry: "/api/v1/inquiries",
  viewing: "/api/v1/viewing-requests",
  reservation: "/api/v1/reservation-requests",
};

const COPY: Record<CrmKind, { title: string; cta: string; success: string }> = {
  inquiry: { title: "Send an inquiry", cta: "Submit inquiry", success: "Thanks! Our team will reach out shortly." },
  viewing: { title: "Request a viewing", cta: "Request viewing", success: "Your viewing request was received." },
  reservation: { title: "Reserve a unit", cta: "Submit reservation", success: "Your reservation request is pending review." },
};

export function ContactForm({ kind, unitLabel }: { kind: CrmKind; unitLabel?: string }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setDone(null);
    const payload: Record<string, unknown> = { fullName, email, phone };
    if (kind === "inquiry") {
      payload.message = message;
      if (unitLabel) payload.unitLabels = [unitLabel];
    }
    if (kind === "viewing") {
      payload.preferredDate = preferredDate;
      payload.preferredTime = preferredTime || undefined;
      payload.notes = notes;
      payload.unitLabels = unitLabel ? [unitLabel] : [];
    }
    if (kind === "reservation") {
      payload.unitLabel = unitLabel;
      payload.intendedMoveIn = preferredDate || undefined;
      payload.notes = notes;
    }
    try {
      const res = await fetch(ENDPOINT[kind], {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "SUCCESS") throw new Error(json.message ?? "Submission failed.");
      setDone(COPY[kind].success + (json.data?.requestId ? ` (ref ${json.data.requestId.slice(0, 8)})` : ""));
      setFullName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setNotes("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="text-lg font-semibold text-neutral-900">{COPY[kind].title}</h2>
      <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </div>

      {(kind === "viewing" || kind === "reservation") && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={kind === "reservation" ? "Intended move-in" : "Preferred date"}
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            required
          />
          {kind === "viewing" && (
            <Input label="Preferred time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
          )}
        </div>
      )}

      {kind === "inquiry" && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-600">Message</span>
          <textarea
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
      )}
      {kind === "viewing" && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-600">Notes</span>
          <textarea
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      )}
      {kind === "reservation" && (
        <p className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          Reserving <span className="font-semibold">{unitLabel}</span>. Our team will confirm availability and terms.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "Submitting…" : COPY[kind].cta}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
          {done}
        </p>
      )}
    </form>
  );
}
