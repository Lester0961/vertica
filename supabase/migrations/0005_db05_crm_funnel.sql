-- =====================================================================
-- DB-05 — CRM, inquiries, and sales funnel
-- clients, inquiries, inquiry_units, viewing_requests, viewing_appointments,
-- reservation_requests, reservations + RLS
--
-- NOTE: Public/guest funnel writes are performed by the API via the
-- server-side service-role client after validation + rate limiting. RLS here
-- therefore restricts direct access to admins (and, where relevant, owners).
-- =====================================================================

create table if not exists public.clients (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  email         citext,
  phone         text,
  email_normalized citext generated always as (email) stored,
  source        text,
  marketing_consent boolean not null default false,
  privacy_class text not null default 'STANDARD',
  merged_into   uuid references public.clients (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists clients_email_idx on public.clients (email_normalized);
create index if not exists clients_phone_idx on public.clients (phone);

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at before update on public.clients
  for each row execute function app.set_updated_at();

create table if not exists public.inquiries (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  source        text,
  status        app.inquiry_status not null default 'NEW',
  status_version int not null default 1,
  owner_id      uuid references public.profiles (id),
  next_action   text,
  next_action_at date,
  summary       text,
  recommendation_session_id uuid references public.recommendation_sessions (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists inquiries_status_idx on public.inquiries (status);
create index if not exists inquiries_owner_idx on public.inquiries (owner_id);
create index if not exists inquiries_next_action_idx on public.inquiries (next_action_at);
create index if not exists inquiries_created_idx on public.inquiries (created_at desc);

drop trigger if exists trg_inquiries_updated_at on public.inquiries;
create trigger trg_inquiries_updated_at before update on public.inquiries
  for each row execute function app.set_updated_at();

create table if not exists public.inquiry_units (
  id            uuid primary key default gen_random_uuid(),
  inquiry_id    uuid not null references public.inquiries (id) on delete cascade,
  unit_id       uuid not null references public.units (id) on delete cascade,
  interest_order int not null default 0,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (inquiry_id, unit_id)
);

create table if not exists public.viewing_requests (
  id            uuid primary key default gen_random_uuid(),
  inquiry_id    uuid not null references public.inquiries (id) on delete cascade,
  unit_id       uuid not null references public.units (id),
  preferred_slots jsonb,
  status        app.request_status not null default 'REQUESTED',
  decision_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists viewing_requests_status_idx on public.viewing_requests (status);

drop trigger if exists trg_viewing_requests_updated_at on public.viewing_requests;
create trigger trg_viewing_requests_updated_at before update on public.viewing_requests
  for each row execute function app.set_updated_at();

create table if not exists public.viewing_appointments (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.viewing_requests (id) on delete cascade,
  unit_id       uuid not null references public.units (id),
  scheduled_at  timestamptz not null,
  staff_id      uuid references public.profiles (id),
  status        app.appointment_status not null default 'SCHEDULED',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists viewing_appts_time_idx on public.viewing_appointments (scheduled_at);

drop trigger if exists trg_viewing_appts_updated_at on public.viewing_appointments;
create trigger trg_viewing_appts_updated_at before update on public.viewing_appointments
  for each row execute function app.set_updated_at();

create table if not exists public.reservation_requests (
  id            uuid primary key default gen_random_uuid(),
  inquiry_id    uuid not null references public.inquiries (id) on delete cascade,
  unit_id       uuid not null references public.units (id),
  status        app.request_status not null default 'REQUESTED',
  decision_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- No duplicate active request for the same inquiry and unit.
create unique index if not exists resreq_active_unique
  on public.reservation_requests (inquiry_id, unit_id)
  where status = 'REQUESTED';

drop trigger if exists trg_resreq_updated_at on public.reservation_requests;
create trigger trg_resreq_updated_at before update on public.reservation_requests
  for each row execute function app.set_updated_at();

create table if not exists public.reservations (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references public.units (id),
  inquiry_id    uuid references public.inquiries (id),
  request_id    uuid references public.reservation_requests (id),
  created_by    uuid references public.profiles (id),
  hold_start    timestamptz not null default now(),
  hold_expires  timestamptz not null,
  status        app.reservation_status not null default 'ACTIVE',
  status_version int not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint hold_window check (hold_expires > hold_start)
);
-- Only one ACTIVE hold per unit.
create unique index if not exists reservations_active_unit_unique
  on public.reservations (unit_id) where status = 'ACTIVE';
create index if not exists reservations_expiry_idx on public.reservations (hold_expires) where status = 'ACTIVE';

drop trigger if exists trg_reservations_updated_at on public.reservations;
create trigger trg_reservations_updated_at before update on public.reservations
  for each row execute function app.set_updated_at();

-- =====================================================================
-- RLS — admin-managed CRM (PII). Guest funnel writes use service role.
-- =====================================================================
alter table public.clients enable row level security;
alter table public.inquiries enable row level security;
alter table public.inquiry_units enable row level security;
alter table public.viewing_requests enable row level security;
alter table public.viewing_appointments enable row level security;
alter table public.reservation_requests enable row level security;
alter table public.reservations enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'clients','inquiries','inquiry_units','viewing_requests',
    'viewing_appointments','reservation_requests','reservations'
  ] loop
    execute format('drop policy if exists %I_admin_all on public.%I', t, t);
    execute format(
      'create policy %I_admin_all on public.%I for all using (app.is_admin()) with check (app.is_admin())',
      t, t
    );
  end loop;
end $$;
