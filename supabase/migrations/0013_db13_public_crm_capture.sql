-- =====================================================================
-- DB-13 — Public CRM capture (inquiries, viewing & reservation requests)
-- Allows anonymous prospects to submit inquiries, viewing requests and
-- reservation requests (write-only). Staff/admin read and act via the
-- portal. No PII beyond contact details; reads remain admin/owner only.
-- =====================================================================

drop policy if exists inquiries_anon_insert on public.inquiries;
create policy inquiries_anon_insert on public.inquiries for insert
  to anon, authenticated
  with check (true);

drop policy if exists inquiry_units_anon_insert on public.inquiry_units;
create policy inquiry_units_anon_insert on public.inquiry_units for insert
  to anon, authenticated
  with check (true);

drop policy if exists viewing_requests_anon_insert on public.viewing_requests;
create policy viewing_requests_anon_insert on public.viewing_requests for insert
  to anon, authenticated
  with check (true);

drop policy if exists viewing_appointments_anon_insert on public.viewing_appointments;
create policy viewing_appointments_anon_insert on public.viewing_appointments for insert
  to anon, authenticated
  with check (true);

drop policy if exists reservation_requests_anon_insert on public.reservation_requests;
create policy reservation_requests_anon_insert on public.reservation_requests for insert
  to anon, authenticated
  with check (true);

-- Prospects are written to clients so staff can action their requests.
drop policy if exists clients_anon_insert on public.clients;
create policy clients_anon_insert on public.clients for insert
  to anon, authenticated
  with check (true);

-- RLS policies are necessary but not sufficient: the anon/authenticated roles
-- also need the table INSERT privilege.
grant insert on public.clients to anon, authenticated;
grant insert on public.inquiries to anon, authenticated;
grant insert on public.inquiry_units to anon, authenticated;
grant insert on public.viewing_requests to anon, authenticated;
grant insert on public.viewing_appointments to anon, authenticated;
grant insert on public.reservation_requests to anon, authenticated;

-- Anonymous prospects have no client/profile yet, so the linking FKs must be
-- nullable to allow public capture. Staff link records later.
alter table public.inquiries alter column client_id drop not null;
alter table public.viewing_requests alter column inquiry_id drop not null;
alter table public.reservation_requests alter column inquiry_id drop not null;
alter table public.viewing_appointments alter column request_id drop not null;
alter table public.viewing_appointments alter column scheduled_at drop not null;
