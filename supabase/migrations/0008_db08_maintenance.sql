-- =====================================================================
-- DB-08 — Maintenance
-- maintenance_requests, maintenance_assignments, maintenance_confirmations,
-- maintenance_status_history + RLS
-- =====================================================================

create table if not exists public.maintenance_requests (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete restrict,
  unit_id       uuid not null references public.units (id),
  category      text not null,
  priority      text not null default 'NORMAL' check (priority in ('LOW','NORMAL','HIGH','EMERGENCY')),
  description   text not null,
  status        app.maintenance_status not null default 'SUBMITTED',
  status_version int not null default 1,
  preferred_schedule jsonb,
  is_safety     boolean not null default false,
  resolution    text,
  closed_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists mr_status_idx on public.maintenance_requests (status);
create index if not exists mr_priority_idx on public.maintenance_requests (priority);
create index if not exists mr_unit_idx on public.maintenance_requests (unit_id);
create index if not exists mr_created_idx on public.maintenance_requests (created_at desc);

drop trigger if exists trg_mr_updated_at on public.maintenance_requests;
create trigger trg_mr_updated_at before update on public.maintenance_requests
  for each row execute function app.set_updated_at();

create table if not exists public.maintenance_assignments (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.maintenance_requests (id) on delete cascade,
  maintenance_user_id uuid not null references public.profiles (id),
  assigned_by   uuid references public.profiles (id),
  assigned_at   timestamptz not null default now(),
  scheduled_at  timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists ma_request_idx on public.maintenance_assignments (request_id);
create index if not exists ma_user_idx on public.maintenance_assignments (maintenance_user_id);
-- One active assignment per request.
create unique index if not exists ma_active_unique
  on public.maintenance_assignments (request_id) where is_active;

create table if not exists public.maintenance_confirmations (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.maintenance_requests (id) on delete cascade,
  tenant_id     uuid not null references public.tenants (id),
  comment       text,
  rating        int check (rating between 1 and 5),
  confirmed_at  timestamptz not null default now(),
  unique (request_id, tenant_id)
);

create table if not exists public.maintenance_status_history (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.maintenance_requests (id) on delete cascade,
  previous_status app.maintenance_status,
  next_status   app.maintenance_status not null,
  prior_work_status app.maintenance_status,
  actor_id      uuid references public.profiles (id),
  reason        text,
  evidence      jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists msh_request_idx on public.maintenance_status_history (request_id, created_at desc);

drop trigger if exists trg_msh_no_mutation on public.maintenance_status_history;
create trigger trg_msh_no_mutation
  before update or delete on public.maintenance_status_history
  for each row execute function app.prevent_mutation();

-- Assigned-maintenance helper.
create or replace function app.is_assigned_maintenance(target_request uuid)
returns boolean language sql stable security definer
set search_path = public, app as $$
  select exists (
    select 1 from public.maintenance_assignments ma
    where ma.request_id = target_request
      and ma.maintenance_user_id = auth.uid()
      and ma.is_active
  );
$$;
revoke all on function app.is_assigned_maintenance(uuid) from public;
grant execute on function app.is_assigned_maintenance(uuid) to anon, authenticated;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.maintenance_requests enable row level security;
alter table public.maintenance_assignments enable row level security;
alter table public.maintenance_confirmations enable row level security;
alter table public.maintenance_status_history enable row level security;

-- requests: tenant own; assigned maintenance staff; admin all.
drop policy if exists mr_read on public.maintenance_requests;
create policy mr_read on public.maintenance_requests for select
  using (
    app.is_admin()
    or app.owns_tenant(tenant_id)
    or app.is_assigned_maintenance(id)
  );
drop policy if exists mr_self_insert on public.maintenance_requests;
create policy mr_self_insert on public.maintenance_requests for insert
  with check (app.owns_tenant(tenant_id));
drop policy if exists mr_admin_write on public.maintenance_requests;
create policy mr_admin_write on public.maintenance_requests for update
  using (app.is_admin() or app.is_assigned_maintenance(id))
  with check (app.is_admin() or app.is_assigned_maintenance(id));

-- assignments: assigned staff read own; admin manages.
drop policy if exists ma_read on public.maintenance_assignments;
create policy ma_read on public.maintenance_assignments for select
  using (app.is_admin() or maintenance_user_id = auth.uid());
drop policy if exists ma_admin_write on public.maintenance_assignments;
create policy ma_admin_write on public.maintenance_assignments for all
  using (app.is_admin()) with check (app.is_admin());

-- confirmations: tenant own; admin reads.
drop policy if exists mc_read on public.maintenance_confirmations;
create policy mc_read on public.maintenance_confirmations for select
  using (app.is_admin() or app.owns_tenant(tenant_id));
drop policy if exists mc_self_insert on public.maintenance_confirmations;
create policy mc_self_insert on public.maintenance_confirmations for insert
  with check (app.owns_tenant(tenant_id));

-- status history: readable to tenant/assigned/admin; written by admin+staff.
drop policy if exists msh_read on public.maintenance_status_history;
create policy msh_read on public.maintenance_status_history for select
  using (
    app.is_admin()
    or app.is_assigned_maintenance(request_id)
    or exists (
      select 1 from public.maintenance_requests r
      where r.id = maintenance_status_history.request_id and app.owns_tenant(r.tenant_id)
    )
  );
drop policy if exists msh_insert on public.maintenance_status_history;
create policy msh_insert on public.maintenance_status_history for insert
  with check (app.is_admin() or app.is_assigned_maintenance(request_id));
