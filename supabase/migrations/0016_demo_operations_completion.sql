-- =====================================================================
-- DB-16 - Demo operations completion
-- Educational compliance configuration, workflow history, access events,
-- supporting indexes, and lightweight private realtime notifications.
-- =====================================================================

alter table public.clients add column if not exists archived_at timestamptz;
alter table public.clients add column if not exists status_version integer not null default 1;
alter table public.reservation_requests add column if not exists status_version integer not null default 1;
alter table public.reservation_requests add column if not exists decision_by uuid references public.profiles(id) on delete set null;
alter table public.reservation_requests add column if not exists decision_at timestamptz;
alter table public.tenants add column if not exists status_version integer not null default 1;

create index if not exists clients_active_created_idx
  on public.clients (created_at desc) where archived_at is null;
create index if not exists inquiries_client_status_idx
  on public.inquiries (client_id, status, created_at desc);
create index if not exists reservation_requests_unit_status_idx
  on public.reservation_requests (unit_id, status, created_at desc);

create table if not exists public.inquiry_status_history (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  previous_status app.inquiry_status,
  next_status app.inquiry_status not null,
  reason text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists inquiry_status_history_timeline_idx
  on public.inquiry_status_history (inquiry_id, created_at desc);

create table if not exists public.reservation_request_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.reservation_requests(id) on delete cascade,
  previous_status app.request_status,
  next_status app.request_status not null,
  reason text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists reservation_request_history_timeline_idx
  on public.reservation_request_history (request_id, created_at desc);

create table if not exists public.access_events (
  id uuid primary key default gen_random_uuid(),
  gate_pass_id uuid not null references public.gate_passes(id) on delete restrict,
  verification_id uuid references public.gate_pass_verifications(id) on delete set null,
  unit_id uuid not null references public.units(id) on delete restrict,
  guard_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('ENTRY','EXIT')),
  visitor_name text,
  vehicle_plate text,
  notes text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists access_events_recent_idx on public.access_events (occurred_at desc);
create index if not exists access_events_pass_idx on public.access_events (gate_pass_id, occurred_at desc);

alter table public.inquiry_status_history enable row level security;
alter table public.reservation_request_history enable row level security;
alter table public.access_events enable row level security;

do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists vertica_authenticated_broadcasts on realtime.messages';
    execute 'create policy vertica_authenticated_broadcasts on realtime.messages for select to authenticated using (topic like ''vertica:%'')';
  end if;
end $$;

create policy inquiry_history_admin_read on public.inquiry_status_history
  for select using (app.is_admin());
create policy inquiry_history_admin_insert on public.inquiry_status_history
  for insert with check (app.is_admin());
create policy reservation_history_admin_read on public.reservation_request_history
  for select using (app.is_admin());
create policy reservation_history_admin_insert on public.reservation_request_history
  for insert with check (app.is_admin());
create policy access_events_staff_read on public.access_events
  for select using (app.is_admin() or app.has_role('GUARD'));
create policy access_events_staff_insert on public.access_events
  for insert with check (app.is_admin() or app.has_role('GUARD'));

update public.legal_rule_sets
set is_active = false
where jurisdiction = 'PH' and is_active;

insert into public.legal_rule_sets (
  jurisdiction, authority_reference, version, effective_from, effective_to,
  verification_status, approval_evidence, parameters, is_active
) values (
  'PH',
  'Educational simulation based on RA 9653 and NHSB Resolution 2024-01',
  '2025-2026-demo',
  '2025-01-01',
  '2026-12-31',
  'VERIFIED',
  'School project configuration',
  '{
    "demo_only": true,
    "max_advance_months": 1,
    "max_deposit_months": 2,
    "rent_increase_rules": [
      {"effective_from":"2025-01-01","effective_to":"2025-12-31","monthly_rent_ceiling":10000,"max_annual_escalation_pct":2.3,"same_tenant_only":true},
      {"effective_from":"2026-01-01","effective_to":"2026-12-31","monthly_rent_ceiling":10000,"max_annual_escalation_pct":1.0,"same_tenant_only":true}
    ]
  }'::jsonb,
  true
)
on conflict (jurisdiction, version) do update set
  authority_reference = excluded.authority_reference,
  effective_from = excluded.effective_from,
  effective_to = excluded.effective_to,
  verification_status = excluded.verification_status,
  approval_evidence = excluded.approval_evidence,
  parameters = excluded.parameters,
  is_active = excluded.is_active;

-- Payloads contain only a table name and record identifier. Clients always
-- refetch the authorized row through their normal RLS-protected endpoint.
do $$
begin
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is not null then
    execute $function$
      create or replace function app.broadcast_demo_change()
      returns trigger
      language plpgsql
      security definer
      set search_path = public, app, realtime
      as $body$
      declare
        record_id uuid;
      begin
        record_id := coalesce(new.id, old.id);
        perform realtime.send(
          jsonb_build_object('table', tg_table_name, 'recordId', record_id::text),
          lower(tg_op),
          'vertica:' || tg_table_name,
          true
        );
        return coalesce(new, old);
      end;
      $body$;
    $function$;

    drop trigger if exists trg_units_demo_realtime on public.units;
    create trigger trg_units_demo_realtime after insert or update or delete on public.units
      for each row execute function app.broadcast_demo_change();
    drop trigger if exists trg_bills_demo_realtime on public.bills;
    create trigger trg_bills_demo_realtime after insert or update or delete on public.bills
      for each row execute function app.broadcast_demo_change();
    drop trigger if exists trg_payments_demo_realtime on public.payments;
    create trigger trg_payments_demo_realtime after insert or update or delete on public.payments
      for each row execute function app.broadcast_demo_change();
    drop trigger if exists trg_maintenance_demo_realtime on public.maintenance_requests;
    create trigger trg_maintenance_demo_realtime after insert or update or delete on public.maintenance_requests
      for each row execute function app.broadcast_demo_change();
    drop trigger if exists trg_gate_passes_demo_realtime on public.gate_passes;
    create trigger trg_gate_passes_demo_realtime after insert or update or delete on public.gate_passes
      for each row execute function app.broadcast_demo_change();
  end if;
end $$;
