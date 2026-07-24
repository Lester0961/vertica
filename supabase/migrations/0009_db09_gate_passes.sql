-- =====================================================================
-- DB-09 — Gate passes
-- gate_passes, gate_pass_visitors, gate_pass_verifications + RLS
-- =====================================================================

create table if not exists public.gate_passes (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references public.units (id),
  tenant_id     uuid not null references public.tenants (id) on delete restrict,
  code_hash     text not null unique,
  valid_from    timestamptz not null default now(),
  valid_to      timestamptz not null,
  status        app.gate_pass_status not null default 'ACTIVE',
  revocation_reason text,
  max_uses      int check (max_uses > 0),
  use_count     int not null default 0 check (use_count >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint gate_pass_window check (valid_to > valid_from)
);
create index if not exists gate_passes_expiry_idx on public.gate_passes (valid_to) where status = 'ACTIVE';
create index if not exists gate_passes_tenant_idx on public.gate_passes (tenant_id);

drop trigger if exists trg_gate_passes_updated_at on public.gate_passes;
create trigger trg_gate_passes_updated_at before update on public.gate_passes
  for each row execute function app.set_updated_at();

create table if not exists public.gate_pass_visitors (
  id            uuid primary key default gen_random_uuid(),
  gate_pass_id  uuid not null references public.gate_passes (id) on delete cascade,
  visitor_name  text not null,
  vehicle_plate text,
  created_at    timestamptz not null default now()
);
create index if not exists gpv_pass_idx on public.gate_pass_visitors (gate_pass_id);

create table if not exists public.gate_pass_verifications (
  id            uuid primary key default gen_random_uuid(),
  gate_pass_id  uuid references public.gate_passes (id) on delete set null,
  guard_id      uuid references public.profiles (id),
  result        text not null check (result in ('VALID','INVALID','EXPIRED','REVOKED','NOT_FOUND')),
  denial_reason text,
  verified_at   timestamptz not null default now()
);
create index if not exists gpv_recent_idx on public.gate_pass_verifications (verified_at desc);
create index if not exists gpv_pass_ref_idx on public.gate_pass_verifications (gate_pass_id);

drop trigger if exists trg_gpv_no_mutation on public.gate_pass_verifications;
create trigger trg_gpv_no_mutation
  before update or delete on public.gate_pass_verifications
  for each row execute function app.prevent_mutation();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.gate_passes enable row level security;
alter table public.gate_pass_visitors enable row level security;
alter table public.gate_pass_verifications enable row level security;

-- gate_passes: tenant own; guard + admin read (for verification); tenant creates.
drop policy if exists gp_read on public.gate_passes;
create policy gp_read on public.gate_passes for select
  using (app.is_admin() or app.has_role('GUARD') or app.owns_tenant(tenant_id));
drop policy if exists gp_self_insert on public.gate_passes;
create policy gp_self_insert on public.gate_passes for insert
  with check (app.owns_tenant(tenant_id));
drop policy if exists gp_self_update on public.gate_passes;
create policy gp_self_update on public.gate_passes for update
  using (app.is_admin() or app.owns_tenant(tenant_id))
  with check (app.is_admin() or app.owns_tenant(tenant_id));

-- visitors: minimum-necessary; tenant own + guard/admin read.
drop policy if exists gpv_read on public.gate_pass_visitors;
create policy gpv_read on public.gate_pass_visitors for select
  using (
    app.is_admin() or app.has_role('GUARD') or exists (
      select 1 from public.gate_passes g
      where g.id = gate_pass_visitors.gate_pass_id and app.owns_tenant(g.tenant_id)
    )
  );
drop policy if exists gpv_self_write on public.gate_pass_visitors;
create policy gpv_self_write on public.gate_pass_visitors for all
  using (
    exists (
      select 1 from public.gate_passes g
      where g.id = gate_pass_visitors.gate_pass_id and app.owns_tenant(g.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from public.gate_passes g
      where g.id = gate_pass_visitors.gate_pass_id and app.owns_tenant(g.tenant_id)
    )
  );

-- verifications: guard + admin read/create.
drop policy if exists gpver_read on public.gate_pass_verifications;
create policy gpver_read on public.gate_pass_verifications for select
  using (app.is_admin() or app.has_role('GUARD'));
drop policy if exists gpver_insert on public.gate_pass_verifications;
create policy gpver_insert on public.gate_pass_verifications for insert
  with check (app.is_admin() or app.has_role('GUARD'));
