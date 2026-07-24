-- =====================================================================
-- DB-02 — Identity and authorization
-- profiles, roles, user_roles + role helpers + RLS
-- =====================================================================

-- --- profiles: one row per Supabase Auth user --------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           citext not null,
  display_name    text,
  phone           text,
  status          text not null default 'INVITED'
                    check (status in ('INVITED', 'ACTIVE', 'DISABLED')),
  invited_at      timestamptz,
  activated_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint profiles_email_format check (position('@' in email) > 1)
);

create unique index if not exists profiles_email_unique on public.profiles (email);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function app.set_updated_at();

-- --- roles: descriptive dictionary (capability semantics) --------------
create table if not exists public.roles (
  role        app.app_role primary key,
  label       text not null,
  description text not null,
  is_system   boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into public.roles (role, label, description) values
  ('SUPER_ADMIN',    'Super Administrator', 'Full system, user, DSS, and legal configuration control.'),
  ('PROPERTY_ADMIN', 'Property Administrator', 'Operational management of inventory, CRM, leases, billing, maintenance.'),
  ('TENANT',         'Tenant', 'Resident portal: lease, bills, payments, maintenance, gate passes.'),
  ('GUARD',          'Guard', 'Gate-pass verification only.'),
  ('MAINTENANCE',    'Maintenance', 'Assigned maintenance work only.')
on conflict (role) do nothing;

-- Prevent deletion of system roles.
create or replace function app.prevent_system_role_delete()
returns trigger language plpgsql as $$
begin
  if old.is_system then
    raise exception 'System role % cannot be deleted.', old.role;
  end if;
  return old;
end; $$;

drop trigger if exists trg_roles_no_delete on public.roles;
create trigger trg_roles_no_delete
  before delete on public.roles
  for each row execute function app.prevent_system_role_delete();

-- --- user_roles --------------------------------------------------------
create table if not exists public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        app.app_role not null references public.roles (role),
  assigned_by uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  unique (user_id, role)
);

create index if not exists user_roles_user_idx on public.user_roles (user_id);
create index if not exists user_roles_role_idx on public.user_roles (role);

-- Guarantee at least one active super administrator remains.
create or replace function app.enforce_last_super_admin()
returns trigger language plpgsql as $$
declare
  remaining int;
begin
  if (tg_op = 'DELETE' and old.role = 'SUPER_ADMIN')
     or (tg_op = 'UPDATE' and old.role = 'SUPER_ADMIN' and new.role <> 'SUPER_ADMIN') then
    select count(*) into remaining
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
     where ur.role = 'SUPER_ADMIN'
       and p.status <> 'DISABLED'
       and ur.id <> old.id;
    if remaining = 0 then
      raise exception 'At least one active super administrator must remain.';
    end if;
  end if;
  return coalesce(new, old);
end; $$;

drop trigger if exists trg_last_super_admin on public.user_roles;
create trigger trg_last_super_admin
  before update or delete on public.user_roles
  for each row execute function app.enforce_last_super_admin();

-- --- Role helper functions (SECURITY DEFINER; bypass RLS safely) --------
create or replace function app.has_role(target app.app_role)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = target
  );
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('SUPER_ADMIN', 'PROPERTY_ADMIN')
  );
$$;

create or replace function app.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'SUPER_ADMIN'
  );
$$;

-- Granted to BOTH anon and authenticated: RLS policy expressions on
-- publicly-readable tables (e.g. units, media) reference these helpers, and
-- Postgres checks EXECUTE permission even when the result is false for anon.
revoke all on function app.has_role(app.app_role) from public;
revoke all on function app.is_admin() from public;
revoke all on function app.is_super_admin() from public;
grant execute on function app.has_role(app.app_role) to anon, authenticated;
grant execute on function app.is_admin() to anon, authenticated;
grant execute on function app.is_super_admin() to anon, authenticated;

-- --- RLS ---------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.roles     enable row level security;
alter table public.user_roles enable row level security;

-- profiles: self read/update; admins read all; super admin manages.
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select using (id = auth.uid() or app.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid() or app.is_admin())
  with check (id = auth.uid() or app.is_admin());

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert on public.profiles
  for insert with check (app.is_admin());

-- roles: readable by any authenticated user; only super admin may write.
drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles
  for select using (auth.role() = 'authenticated');

drop policy if exists roles_superadmin_write on public.roles;
create policy roles_superadmin_write on public.roles
  for all using (app.is_super_admin()) with check (app.is_super_admin());

-- user_roles: self read; only super admin manages assignments.
drop policy if exists user_roles_self_select on public.user_roles;
create policy user_roles_self_select on public.user_roles
  for select using (user_id = auth.uid() or app.is_admin());

drop policy if exists user_roles_superadmin_write on public.user_roles;
create policy user_roles_superadmin_write on public.user_roles
  for all using (app.is_super_admin()) with check (app.is_super_admin());

comment on table public.profiles is 'One row per Supabase Auth user. No password storage.';
comment on table public.user_roles is 'Role assignments. Managed by SUPER_ADMIN only.';
