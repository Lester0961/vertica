-- =====================================================================
-- DB-06 — Tenant and lease management
-- tenants, legal_rule_sets, compliance_results, leases,
-- lease_acknowledgments, lease_status_history + RLS
-- =====================================================================

create table if not exists public.tenants (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references public.profiles (id) on delete set null,
  client_id     uuid references public.clients (id),
  tenant_number text not null unique,
  status        text not null default 'ACTIVE' check (status in ('PENDING','ACTIVE','INACTIVE')),
  emergency_contact jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists tenants_profile_idx on public.tenants (profile_id);

drop trigger if exists trg_tenants_updated_at on public.tenants;
create trigger trg_tenants_updated_at before update on public.tenants
  for each row execute function app.set_updated_at();

-- Tenant ownership helper (SECURITY DEFINER, used across billing/maintenance).
create or replace function app.owns_tenant(target uuid)
returns boolean language sql stable security definer
set search_path = public, app as $$
  select exists (
    select 1 from public.tenants t
    where t.id = target and t.profile_id = auth.uid()
  );
$$;
revoke all on function app.owns_tenant(uuid) from public;
grant execute on function app.owns_tenant(uuid) to anon, authenticated;

create table if not exists public.legal_rule_sets (
  id            uuid primary key default gen_random_uuid(),
  jurisdiction  text not null,
  authority_reference text,
  version       text not null,
  verification_status text not null default 'UNVERIFIED'
                  check (verification_status in ('UNVERIFIED','VERIFIED','REJECTED')),
  effective_from date,
  effective_to  date,
  parameters    jsonb not null,
  reviewer_id   uuid references public.profiles (id),
  approval_evidence text,
  is_active     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (jurisdiction, version),
  -- Only verified configurations may become active (fail closed).
  constraint active_requires_verified check (not is_active or verification_status = 'VERIFIED')
);
create unique index if not exists legal_rules_single_active
  on public.legal_rule_sets (jurisdiction) where is_active;

create table if not exists public.compliance_results (
  id            uuid primary key default gen_random_uuid(),
  input_snapshot jsonb not null,
  rule_set_id   uuid references public.legal_rule_sets (id),
  rule_version  text,
  outcome       app.compliance_outcome not null,
  calculation_trace jsonb,
  locked        boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.leases (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references public.units (id) on delete restrict,
  tenant_id     uuid not null references public.tenants (id) on delete restrict,
  start_date    date not null,
  end_date      date not null,
  monthly_rent  numeric(12,2) not null check (monthly_rent >= 0),
  advance_amount numeric(12,2) not null default 0 check (advance_amount >= 0),
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  renewal_parent_id uuid references public.leases (id),
  status        app.lease_status not null default 'DRAFT',
  status_version int not null default 1,
  compliance_result_id uuid references public.compliance_results (id),
  document_path text,
  document_version text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint lease_dates check (end_date > start_date)
);
create index if not exists leases_unit_idx on public.leases (unit_id);
create index if not exists leases_tenant_idx on public.leases (tenant_id);
create index if not exists leases_status_idx on public.leases (status);

-- No overlapping ACTIVE leases per unit.
alter table public.leases drop constraint if exists leases_no_overlap;
alter table public.leases add constraint leases_no_overlap
  exclude using gist (
    unit_id with =,
    daterange(start_date, end_date, '[]') with &&
  ) where (status = 'ACTIVE');

drop trigger if exists trg_leases_updated_at on public.leases;
create trigger trg_leases_updated_at before update on public.leases
  for each row execute function app.set_updated_at();

create table if not exists public.lease_acknowledgments (
  id            uuid primary key default gen_random_uuid(),
  lease_id      uuid not null references public.leases (id) on delete cascade,
  tenant_id     uuid not null references public.tenants (id),
  document_version text not null,
  acknowledged_at timestamptz not null default now(),
  ip_address    inet,
  user_agent    text,
  unique (lease_id, tenant_id, document_version)
);

drop trigger if exists trg_lease_ack_no_mutation on public.lease_acknowledgments;
create trigger trg_lease_ack_no_mutation
  before update or delete on public.lease_acknowledgments
  for each row execute function app.prevent_mutation();

create table if not exists public.lease_status_history (
  id            uuid primary key default gen_random_uuid(),
  lease_id      uuid not null references public.leases (id) on delete cascade,
  previous_status app.lease_status,
  next_status   app.lease_status not null,
  actor_id      uuid references public.profiles (id),
  reason        text,
  effective_date date,
  request_id    uuid,
  created_at    timestamptz not null default now()
);
create index if not exists lease_history_lease_idx on public.lease_status_history (lease_id, created_at desc);

drop trigger if exists trg_lease_history_no_mutation on public.lease_status_history;
create trigger trg_lease_history_no_mutation
  before update or delete on public.lease_status_history
  for each row execute function app.prevent_mutation();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.tenants enable row level security;
alter table public.legal_rule_sets enable row level security;
alter table public.compliance_results enable row level security;
alter table public.leases enable row level security;
alter table public.lease_acknowledgments enable row level security;
alter table public.lease_status_history enable row level security;

-- tenants: self read; admin manage.
drop policy if exists tenants_self_read on public.tenants;
create policy tenants_self_read on public.tenants for select
  using (profile_id = auth.uid() or app.is_admin());
drop policy if exists tenants_admin_write on public.tenants;
create policy tenants_admin_write on public.tenants for all
  using (app.is_admin()) with check (app.is_admin());

-- legal_rule_sets: admins read; super admin writes.
drop policy if exists legal_read on public.legal_rule_sets;
create policy legal_read on public.legal_rule_sets for select using (app.is_admin());
drop policy if exists legal_write on public.legal_rule_sets;
create policy legal_write on public.legal_rule_sets for all
  using (app.is_super_admin()) with check (app.is_super_admin());

-- compliance_results: admins only.
drop policy if exists compliance_admin on public.compliance_results;
create policy compliance_admin on public.compliance_results for all
  using (app.is_admin()) with check (app.is_admin());

-- leases: tenant reads own; admin manages.
drop policy if exists leases_self_read on public.leases;
create policy leases_self_read on public.leases for select
  using (app.is_admin() or app.owns_tenant(tenant_id));
drop policy if exists leases_admin_write on public.leases;
create policy leases_admin_write on public.leases for all
  using (app.is_admin()) with check (app.is_admin());

-- lease_acknowledgments: tenant reads/creates own; admin reads.
drop policy if exists lease_ack_self_read on public.lease_acknowledgments;
create policy lease_ack_self_read on public.lease_acknowledgments for select
  using (app.is_admin() or app.owns_tenant(tenant_id));
drop policy if exists lease_ack_self_insert on public.lease_acknowledgments;
create policy lease_ack_self_insert on public.lease_acknowledgments for insert
  with check (app.owns_tenant(tenant_id));

-- lease_status_history: tenant reads own lease history; admin reads/writes.
drop policy if exists lease_hist_read on public.lease_status_history;
create policy lease_hist_read on public.lease_status_history for select
  using (
    app.is_admin() or exists (
      select 1 from public.leases l
      where l.id = lease_status_history.lease_id and app.owns_tenant(l.tenant_id)
    )
  );
drop policy if exists lease_hist_admin_insert on public.lease_status_history;
create policy lease_hist_admin_insert on public.lease_status_history for insert
  with check (app.is_admin());
