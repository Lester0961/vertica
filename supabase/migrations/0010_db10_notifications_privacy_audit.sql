-- =====================================================================
-- DB-10 — Notifications, privacy, and audit
-- notifications, privacy_notice_receipts, data_subject_requests, audit_logs,
-- idempotency_keys, rate_limit_events, system_settings + RLS
-- =====================================================================

create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  type          text not null,
  title         text not null,
  body          text,
  target_url    text,
  dedupe_key    text,
  channel       text not null default 'IN_APP',
  created_at    timestamptz not null default now(),
  read_at       timestamptz,
  unique (user_id, dedupe_key)
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table if not exists public.privacy_notice_receipts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles (id) on delete set null,
  client_id     uuid references public.clients (id) on delete set null,
  session_id    uuid,
  notice_version text not null,
  action        text not null,
  evidence_hash text,
  created_at    timestamptz not null default now()
);
create index if not exists pnr_user_idx on public.privacy_notice_receipts (user_id);

drop trigger if exists trg_pnr_no_mutation on public.privacy_notice_receipts;
create trigger trg_pnr_no_mutation
  before update or delete on public.privacy_notice_receipts
  for each row execute function app.prevent_mutation();

create table if not exists public.data_subject_requests (
  id            uuid primary key default gen_random_uuid(),
  request_type  text not null check (request_type in ('ACCESS','ERASURE','RECTIFICATION','OBJECTION','PORTABILITY')),
  requester_profile_id uuid references public.profiles (id),
  requester_email citext,
  identity_verified boolean not null default false,
  due_date      date,
  status        text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','RESOLVED','REJECTED','ON_HOLD')),
  resolution    text,
  legal_hold    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_dsr_updated_at on public.data_subject_requests;
create trigger trg_dsr_updated_at before update on public.data_subject_requests
  for each row execute function app.set_updated_at();

create table if not exists public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references public.profiles (id),
  actor_role    text,
  action        text not null,
  entity        text not null,
  entity_id     uuid,
  before_data   jsonb,
  after_data    jsonb,
  request_id    uuid,
  source        text,
  created_at    timestamptz not null default now()
);
create index if not exists audit_entity_idx on public.audit_logs (entity, entity_id);
create index if not exists audit_actor_idx on public.audit_logs (actor_id);
create index if not exists audit_request_idx on public.audit_logs (request_id);
create index if not exists audit_created_idx on public.audit_logs (created_at desc);

drop trigger if exists trg_audit_no_mutation on public.audit_logs;
create trigger trg_audit_no_mutation
  before update or delete on public.audit_logs
  for each row execute function app.prevent_mutation();

create table if not exists public.idempotency_keys (
  id            uuid primary key default gen_random_uuid(),
  subject_key   text not null,
  idempotency_key text not null,
  request_hash  text not null,
  response_body jsonb,
  response_status int,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  unique (subject_key, idempotency_key)
);
create index if not exists idem_expiry_idx on public.idempotency_keys (expires_at);

create table if not exists public.rate_limit_events (
  id            uuid primary key default gen_random_uuid(),
  bucket        text not null,
  subject_hash  text not null,
  window_start  timestamptz not null,
  count         int not null default 1,
  created_at    timestamptz not null default now(),
  unique (bucket, subject_hash, window_start)
);
create index if not exists rle_window_idx on public.rate_limit_events (window_start);

create table if not exists public.system_settings (
  key           text primary key,
  value         jsonb not null,
  version       int not null default 1,
  environment   text not null default 'ALL',
  updated_by    uuid references public.profiles (id),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_settings_updated_at on public.system_settings;
create trigger trg_settings_updated_at before update on public.system_settings
  for each row execute function app.set_updated_at();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.notifications enable row level security;
alter table public.privacy_notice_receipts enable row level security;
alter table public.data_subject_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.rate_limit_events enable row level security;
alter table public.system_settings enable row level security;

-- notifications: user own read + mark read.
drop policy if exists notif_self_read on public.notifications;
create policy notif_self_read on public.notifications for select
  using (user_id = auth.uid() or app.is_admin());
drop policy if exists notif_self_update on public.notifications;
create policy notif_self_update on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- privacy receipts: self + admin read.
drop policy if exists pnr_read on public.privacy_notice_receipts;
create policy pnr_read on public.privacy_notice_receipts for select
  using (app.is_admin() or user_id = auth.uid());

-- data subject requests: admin only.
drop policy if exists dsr_admin on public.data_subject_requests;
create policy dsr_admin on public.data_subject_requests for all
  using (app.is_admin()) with check (app.is_admin());

-- audit logs: admin read only; inserts happen via service role.
drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs for select
  using (app.is_admin());

-- idempotency + rate limits: service-role only (no policies => no anon/auth access).

-- system settings: admins read; super admin writes.
drop policy if exists settings_read on public.system_settings;
create policy settings_read on public.system_settings for select
  using (app.is_admin());
drop policy if exists settings_write on public.system_settings;
create policy settings_write on public.system_settings for all
  using (app.is_super_admin()) with check (app.is_super_admin());
