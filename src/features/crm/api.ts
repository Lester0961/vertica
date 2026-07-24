import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { type ApiContext, register } from "@/lib/api/router";
import { getUnitsByLabels, isUnitAvailable } from "@/features/units/queries";

async function resolveUnitIds(labels: string[]): Promise<string[] | null> {
  if (!labels.length) return [];
  const units = await getUnitsByLabels(labels);
  if (units.length !== labels.length) return null; // some label invalid
  return units.map((u) => u.id);
}

// ---- Shared: capture the prospect as a client record -------------------
// Public submissions are unauthenticated, so writes go through the
// server-only service-role client (bypasses RLS) within this trusted,
// audited server context.
async function captureClient(
  supabase: ReturnType<typeof import("@/lib/supabase/service").createServiceRoleClient>,
  fullName: string,
  email: string,
  phone: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("clients")
    .insert({ full_name: fullName, email, phone, source: "WEB" })
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[crm] client insert:", JSON.stringify(error));
    return null;
  }
  return data?.id ?? null;
}

// ---- Inquiries ----------------------------------------------------------
const inquirySchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(5).max(40),
  message: z.string().max(2000).optional(),
  unitLabels: z.array(z.string()).max(10).optional(),
});

async function inquiryHandler(ctx: ApiContext) {
  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.");
  }
  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) return fail("BAD_REQUEST", "Invalid inquiry.", { issues: parsed.error.issues });

  const { fullName, email, phone, message, unitLabels } = parsed.data;
  const ids = unitLabels?.length ? await resolveUnitIds(unitLabels) : [];
  if (ids === null) return fail("BAD_REQUEST", "One or more unit labels are invalid.");

  const { createServiceRoleClient } = await import("@/lib/supabase/service");
  const supabase = createServiceRoleClient();
  const clientId = await captureClient(supabase, fullName, email, phone);
  if (!clientId) return fail("INTERNAL", "Could not save prospect.");

  const id = randomUUID();
  const { error } = await supabase.from("inquiries").insert({
    id,
    client_id: clientId,
    summary: message ?? null,
    source: "WEB",
    status: "NEW",
  });
  if (error) return fail("INTERNAL", "Could not save inquiry.");
  if (ids.length) {
    await supabase
      .from("inquiry_units")
      .insert(ids.map((unitId, i) => ({ inquiry_id: id, unit_id: unitId, interest_order: i + 1 })));
  }
  return ok({ inquiryId: id });
}

// ---- Viewing requests ---------------------------------------------------
const viewingSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(5).max(40),
  preferredDate: z.string(),
  preferredTime: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
  unitLabels: z.array(z.string()).min(1).max(5),
});

async function viewingHandler(ctx: ApiContext) {
  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.");
  }
  const parsed = viewingSchema.safeParse(body);
  if (!parsed.success) return fail("BAD_REQUEST", "Invalid viewing request.", { issues: parsed.error.issues });

  const { fullName, email, phone, preferredDate, preferredTime, notes, unitLabels } = parsed.data;
  const ids = await resolveUnitIds(unitLabels);
  if (ids === null) return fail("BAD_REQUEST", "One or more unit labels are invalid.");

  const { createServiceRoleClient } = await import("@/lib/supabase/service");
  const supabase = createServiceRoleClient();
  const clientId = await captureClient(supabase, fullName, email, phone);
  if (!clientId) return fail("INTERNAL", "Could not save prospect.");

  const requestId = randomUUID();
  const { error } = await supabase.from("viewing_requests").insert({
    id: requestId,
    inquiry_id: null,
    unit_id: ids[0]!,
    preferred_slots: [{ date: preferredDate, time: preferredTime ?? null }],
    status: "REQUESTED",
  });
  void clientId;
  if (error) return fail("INTERNAL", "Could not save viewing request.");

  const apptRows = ids.map((unitId) => ({
    request_id: requestId,
    unit_id: unitId,
    status: "REQUESTED",
  }));
  await supabase.from("viewing_appointments").insert(apptRows);
  return ok({ requestId });
}

// ---- Reservation requests ----------------------------------------------
const reservationSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(5).max(40),
  unitLabel: z.string(),
  intendedMoveIn: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

async function reservationHandler(ctx: ApiContext) {
  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.");
  }
  const parsed = reservationSchema.safeParse(body);
  if (!parsed.success) return fail("BAD_REQUEST", "Invalid reservation request.", { issues: parsed.error.issues });

  const { fullName, email, phone, unitLabel, intendedMoveIn, notes } = parsed.data;
  const available = await isUnitAvailable(unitLabel);
  if (!available) return fail("STATE_CONFLICT", "That unit is no longer available.");

  const { createClient } = await import("@/lib/supabase/server");
  const anon = await createClient();
  const { data: unit } = await anon
    .from("units")
    .select("id")
    .eq("status", "AVAILABLE")
    .eq("public_label", unitLabel)
    .maybeSingle();
  if (!unit) return fail("STATE_CONFLICT", "That unit is no longer available.");

  // Business rule: block if an active reservation or lease already exists.
  const { data: conflict } = await anon
    .from("reservation_requests")
    .select("id")
    .eq("unit_id", unit.id)
    .in("status", ["PENDING", "APPROVED", "ACTIVE"])
    .maybeSingle();
  if (conflict) return fail("STATE_CONFLICT", "A reservation is already in progress for this unit.");

  const { data: lease } = await anon
    .from("leases")
    .select("id")
    .eq("unit_id", unit.id)
    .in("status", ["ACTIVE", "SIGNED", "PENDING"])
    .maybeSingle();
  if (lease) return fail("STATE_CONFLICT", "This unit is already under lease.");

  const { createServiceRoleClient } = await import("@/lib/supabase/service");
  const supabase = createServiceRoleClient();
  const clientId = await captureClient(supabase, fullName, email, phone);
  if (!clientId) return fail("INTERNAL", "Could not save prospect.");

  const id = randomUUID();
  const { error } = await supabase.from("reservation_requests").insert({
    id,
    inquiry_id: null,
    unit_id: unit.id,
    status: "REQUESTED",
    decision_reason: notes ?? null,
  });
  void clientId;
  if (error) return fail("INTERNAL", "Could not save reservation request.");
  return ok({ requestId: id });
}

export function registerCrmRoutes(): void {
  register("POST", "inquiries", inquiryHandler);
  register("POST", "viewing-requests", viewingHandler);
  register("POST", "reservation-requests", reservationHandler);
}
