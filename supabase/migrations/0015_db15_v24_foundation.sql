-- =====================================================================
-- DB-15 — v2.4 baseline reconciliation foundation
-- Forward-only additions for the seven v2.4 baseline records that were
-- absent from the earlier implementation. Existing operational tables and
-- the announcements extension are deliberately preserved.
-- =====================================================================

do $$ begin
  create type app.file_validation_status as enum ('PENDING','VALID','REJECTED','ERROR');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.occupant_status as enum ('ACTIVE','MOVED_OUT','ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.report_export_status as enum ('QUEUED','RUNNING','COMPLETED','FAILED','EXPIRED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.report_export_format as enum ('CSV','XLSX','PDF');
exception when duplicate_object then null; end $$;

-- Align the existing profile shape with the v2.4 identity contract without
-- changing its primary key/Auth linkage or current status values.
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists archived_at timestamptz;
alter table public.profiles add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists updated_by uuid references public.profiles(id) on delete set null;
update public.profiles
set full_name = coalesce(nullif(btrim(display_name), ''), split_part(email::text, '@', 1))
where full_name is null or btrim(full_name) = '';
alter table public.profiles alter column full_name set not null;
alter table public.profiles drop constraint if exists profiles_full_name_nonblank;
alter table public.profiles add constraint profiles_full_name_nonblank check (btrim(full_name) <> '');

create table if not exists public.public_content_blocks (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete restrict,
  content_type text not null check (content_type in ('PROPERTY','AMENITY','LOCATION','FAQ','PROCESS','TERMS','PRIVACY')),
  code text not null,
  title text not null,
  summary text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  media jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  status text not null default 'DRAFT' check (status in ('DRAFT','PUBLISHED','ARCHIVED')),
  version bigint not null default 1,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (building_id, content_type, code),
  check (code ~ '^[a-z0-9][a-z0-9._-]*$'),
  check (jsonb_typeof(payload) = 'object' and jsonb_typeof(media) = 'array'),
  check (sort_order >= 0),
  check (version > 0),
  check ((status = 'PUBLISHED' and published_at is not null and archived_at is null) or status <> 'PUBLISHED')
);
create index if not exists public_content_published_idx on public.public_content_blocks (building_id, content_type, sort_order, code) where status = 'PUBLISHED' and archived_at is null;
create index if not exists public_content_admin_idx on public.public_content_blocks (status, updated_at desc);

create table if not exists public.inquiry_notes (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete restrict,
  note text not null,
  visibility text not null default 'INTERNAL' check (visibility in ('INTERNAL','CLIENT_VISIBLE')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  redacted_at timestamptz,
  redacted_by uuid references public.profiles(id) on delete set null,
  redaction_reason text,
  check (btrim(note) <> ''),
  check ((redacted_at is null and redacted_by is null and redaction_reason is null)
      or (redacted_at is not null and redacted_by is not null and redaction_reason is not null and btrim(redaction_reason) <> ''))
);
create index if not exists inquiry_notes_timeline_idx on public.inquiry_notes (inquiry_id, created_at, id);
create index if not exists inquiry_notes_author_idx on public.inquiry_notes (created_by, created_at desc);

create table if not exists public.lease_occupants (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  relationship_code text not null,
  is_minor boolean not null default false,
  status app.occupant_status not null default 'ACTIVE',
  move_in_date date,
  move_out_date date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (btrim(full_name) <> '' and btrim(relationship_code) <> ''),
  check (move_out_date is null or move_in_date is null or move_out_date >= move_in_date),
  check (status <> 'MOVED_OUT' or move_out_date is not null)
);
create unique index if not exists lease_occupants_profile_uq on public.lease_occupants (lease_id, profile_id) where profile_id is not null and status <> 'ARCHIVED';
create index if not exists lease_occupants_lease_idx on public.lease_occupants (lease_id, status, full_name);
create index if not exists lease_occupants_profile_idx on public.lease_occupants (profile_id) where profile_id is not null and status = 'ACTIVE';

create table if not exists public.lease_documents (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete restrict,
  document_type text not null check (document_type in ('LEASE','ADDENDUM','NOTICE','OTHER')),
  version text not null,
  private_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  sha256_hash text not null,
  validation_status app.file_validation_status not null default 'PENDING',
  validated_at timestamptz,
  validation_error text,
  current boolean not null default false,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (lease_id, document_type, version),
  check (btrim(version) <> '' and btrim(private_path) <> '' and btrim(mime_type) <> ''),
  check (size_bytes > 0 and sha256_hash ~ '^[0-9a-f]{64}$'),
  check ((validation_status = 'PENDING' and validated_at is null and validation_error is null)
      or (validation_status = 'VALID' and validated_at is not null and validation_error is null)
      or (validation_status in ('REJECTED','ERROR') and validated_at is not null and validation_error is not null and btrim(validation_error) <> '')),
  check (not current or (validation_status = 'VALID' and archived_at is null))
);
create unique index if not exists one_current_lease_document on public.lease_documents (lease_id, document_type) where current and archived_at is null;
create index if not exists lease_documents_lease_idx on public.lease_documents (lease_id, document_type, created_at desc);

create table if not exists public.billing_runs (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  filters jsonb not null default '{}'::jsonb,
  preview_payload jsonb not null,
  preview_hash text not null,
  preview_version bigint not null default 1,
  status text not null default 'PREVIEW' check (status in ('PREVIEW','ISSUING','ISSUED','CANCELLED','FAILED','EXPIRED')),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  issued_by uuid references public.profiles(id) on delete set null,
  issued_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  check (jsonb_typeof(filters) = 'object' and jsonb_typeof(preview_payload) = 'object'),
  check (preview_hash ~ '^[0-9a-f]{64}$'),
  check (preview_version > 0),
  check (expires_at > created_at),
  check ((status = 'ISSUED' and issued_at is not null and issued_by is not null) or (status <> 'ISSUED' and issued_at is null and issued_by is null)),
  check (status <> 'FAILED' or (failure_reason is not null and btrim(failure_reason) <> ''))
);
create index if not exists billing_runs_queue_idx on public.billing_runs (status, expires_at, created_at) where status in ('PREVIEW','ISSUING');
create index if not exists billing_runs_requester_idx on public.billing_runs (requested_by, created_at desc);
create unique index if not exists billing_runs_preview_hash_uq on public.billing_runs (requested_by, preview_hash) where status in ('PREVIEW','ISSUING');

create table if not exists public.maintenance_evidence (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.maintenance_requests(id) on delete restrict,
  assignment_id uuid references public.maintenance_assignments(id) on delete set null,
  evidence_type text not null check (evidence_type in ('BEFORE','DURING','AFTER','RECEIPT','OTHER')),
  private_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  sha256_hash text not null,
  caption text,
  validation_status app.file_validation_status not null default 'PENDING',
  validated_at timestamptz,
  validation_error text,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (btrim(private_path) <> '' and btrim(mime_type) <> ''),
  check (size_bytes > 0 and sha256_hash ~ '^[0-9a-f]{64}$'),
  check ((validation_status = 'PENDING' and validated_at is null and validation_error is null)
      or (validation_status = 'VALID' and validated_at is not null and validation_error is null)
      or (validation_status in ('REJECTED','ERROR') and validated_at is not null and validation_error is not null and btrim(validation_error) <> ''))
);
create index if not exists maintenance_evidence_request_idx on public.maintenance_evidence (request_id, evidence_type, created_at);
create index if not exists maintenance_evidence_validation_idx on public.maintenance_evidence (validation_status, created_at) where validation_status in ('PENDING','ERROR');

create table if not exists public.report_exports (
  id uuid primary key default gen_random_uuid(),
  report_code text not null,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  filters jsonb not null default '{}'::jsonb,
  format app.report_export_format not null,
  status app.report_export_status not null default 'QUEUED',
  status_version bigint not null default 1,
  private_path text,
  mime_type text,
  size_bytes bigint,
  sha256_hash text,
  row_count bigint,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (report_code ~ '^[A-Z][A-Z0-9_]*$'),
  check (jsonb_typeof(filters) = 'object'),
  check (status_version > 0),
  check (expires_at > created_at),
  check (sha256_hash is null or sha256_hash ~ '^[0-9a-f]{64}$'),
  check (status <> 'COMPLETED' or (private_path is not null and mime_type is not null and size_bytes is not null and size_bytes > 0 and sha256_hash is not null and row_count is not null and row_count >= 0 and completed_at is not null)),
  check (status <> 'FAILED' or (error_code is not null and btrim(error_code) <> '' and completed_at is not null)),
  check (status <> 'RUNNING' or started_at is not null)
);
create index if not exists report_exports_requester_idx on public.report_exports (requested_by, created_at desc);
create index if not exists report_exports_worker_idx on public.report_exports (status, created_at) where status in ('QUEUED','RUNNING');
create index if not exists report_exports_cleanup_idx on public.report_exports (expires_at) where status = 'COMPLETED';

-- Conservative RLS: all new base records are private. Read/write APIs and
-- locked transactions will be added in later reconciliation migrations.
alter table public.public_content_blocks enable row level security;
alter table public.inquiry_notes enable row level security;
alter table public.lease_occupants enable row level security;
alter table public.lease_documents enable row level security;
alter table public.billing_runs enable row level security;
alter table public.maintenance_evidence enable row level security;
alter table public.report_exports enable row level security;

create policy pcb_admin_read on public.public_content_blocks for select using (app.is_admin());
create policy pcb_admin_write on public.public_content_blocks for all using (app.is_admin()) with check (app.is_admin());
create policy inquiry_notes_admin_read on public.inquiry_notes for select using (app.is_admin());
create policy inquiry_notes_admin_insert on public.inquiry_notes for insert with check (app.is_admin());
create policy lease_occupants_read on public.lease_occupants for select using (app.is_admin() or exists (select 1 from public.leases l where l.id = lease_occupants.lease_id and app.owns_tenant(l.tenant_id)));
create policy lease_documents_read on public.lease_documents for select using (app.is_admin() or exists (select 1 from public.leases l where l.id = lease_documents.lease_id and app.owns_tenant(l.tenant_id)));
create policy billing_runs_admin_read on public.billing_runs for select using (app.is_admin());
create policy maintenance_evidence_read on public.maintenance_evidence for select using (app.is_admin() or exists (select 1 from public.maintenance_requests r where r.id = maintenance_evidence.request_id and (app.owns_tenant(r.tenant_id) or app.is_assigned_maintenance(r.id))));
create policy report_exports_read on public.report_exports for select using (app.is_admin() or requested_by = auth.uid());

drop trigger if exists trg_pcb_updated_at on public.public_content_blocks;
create trigger trg_pcb_updated_at before update on public.public_content_blocks for each row execute function app.set_updated_at();
drop trigger if exists trg_lease_occupants_updated_at on public.lease_occupants;
create trigger trg_lease_occupants_updated_at before update on public.lease_occupants for each row execute function app.set_updated_at();
drop trigger if exists trg_billing_runs_updated_at on public.billing_runs;
create trigger trg_billing_runs_updated_at before update on public.billing_runs for each row execute function app.set_updated_at();
drop trigger if exists trg_report_exports_updated_at on public.report_exports;
create trigger trg_report_exports_updated_at before update on public.report_exports for each row execute function app.set_updated_at();

-- A tenant may issue a pass only for the unit on an active lease. This closes
-- the direct-Supabase-write gap that the previous tenant-only policy allowed.
drop policy if exists gp_self_insert on public.gate_passes;
create policy gp_self_insert on public.gate_passes for insert
  with check (
    app.owns_tenant(tenant_id)
    and exists (
      select 1 from public.leases l
      where l.tenant_id = gate_passes.tenant_id
        and l.unit_id = gate_passes.unit_id
        and l.status = 'ACTIVE'
    )
  );

-- Payment ownership must also be true for direct RLS-protected writes, not
-- only the server API. A tenant cannot target another tenant's bill.
drop policy if exists payments_self_insert on public.payments;
create policy payments_self_insert on public.payments for insert
  with check (
    app.owns_tenant(tenant_id)
    and bill_id is not null
    and exists (
      select 1 from public.bills b
      where b.id = payments.bill_id
        and b.tenant_id = payments.tenant_id
        and b.accounting_status in ('ISSUED','PARTIALLY_PAID','OVERDUE')
        and b.balance > 0
    )
  );

-- Locked manual-payment review. It keeps review history, allocation, bill
-- balance, and payment state in one transaction so concurrent reviews cannot
-- over-credit a bill.
create or replace function public.verify_payment_transaction(
  p_payment_id uuid,
  p_decision text,
  p_approved_amount numeric(12,2),
  p_reason text,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_payment public.payments;
  v_bill public.bills;
  v_paid numeric(12,2);
  v_next_bill_status app.bill_status;
begin
  if p_decision not in ('APPROVED','PARTIALLY_APPROVED','REJECTED') then
    raise exception 'INVALID_DECISION';
  end if;
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_actor_id and ur.role in ('SUPER_ADMIN','PROPERTY_ADMIN')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_payment.status not in ('SUBMITTED','UNDER_REVIEW') then raise exception 'STATE_CONFLICT'; end if;
  if v_payment.bill_id is null then raise exception 'PAYMENT_BILL_REQUIRED'; end if;

  select * into v_bill from public.bills where id = v_payment.bill_id for update;
  if not found or v_bill.tenant_id <> v_payment.tenant_id then raise exception 'PAYMENT_BILL_MISMATCH'; end if;
  if v_bill.accounting_status not in ('ISSUED','PARTIALLY_PAID','OVERDUE') then raise exception 'BILL_NOT_OPEN'; end if;

  if p_decision = 'REJECTED' then
    if p_reason is null or btrim(p_reason) = '' then raise exception 'REASON_REQUIRED'; end if;
    update public.payments
      set status = 'REJECTED', approved_amount = null, reviewed_at = now(), reviewed_by = p_actor_id,
          decision_reason = p_reason, updated_at = now()
      where id = v_payment.id;
  else
    if p_approved_amount is null or p_approved_amount <= 0
       or p_approved_amount > v_payment.submitted_amount or p_approved_amount > v_bill.balance then
      raise exception 'APPROVED_AMOUNT_INVALID';
    end if;
    if p_decision = 'PARTIALLY_APPROVED' and (p_reason is null or btrim(p_reason) = '') then
      raise exception 'REASON_REQUIRED';
    end if;

    update public.payments
      set status = p_decision::app.payment_status, approved_amount = p_approved_amount,
          reviewed_at = now(), reviewed_by = p_actor_id, decision_reason = nullif(btrim(coalesce(p_reason, '')), ''),
          updated_at = now()
      where id = v_payment.id;
    insert into public.payment_allocations (payment_id, bill_id, amount)
      values (v_payment.id, v_bill.id, p_approved_amount);
    select coalesce(sum(amount), 0) into v_paid from public.payment_allocations where bill_id = v_bill.id;
    v_paid := least(v_paid, v_bill.total_amount);
    v_next_bill_status := case
      when v_paid >= v_bill.total_amount then 'PAID'::app.bill_status
      else 'PARTIALLY_PAID'::app.bill_status
    end;
    update public.bills
      set paid_amount = v_paid,
          balance = greatest(v_bill.total_amount - v_paid, 0),
          accounting_status = v_next_bill_status,
          updated_at = now()
      where id = v_bill.id;
  end if;

  insert into public.payment_verification_history
    (payment_id, previous_status, next_status, reviewer_id, reason, amount_approved)
  values
    (v_payment.id, v_payment.status, p_decision::app.payment_status, p_actor_id,
     nullif(btrim(coalesce(p_reason, '')), ''),
     case when p_decision = 'REJECTED' then null else p_approved_amount end);

  return jsonb_build_object(
    'paymentId', v_payment.id,
    'status', p_decision,
    'approvedAmount', case when p_decision = 'REJECTED' then null else p_approved_amount end,
    'billId', v_bill.id
  );
end;
$$;
revoke all on function public.verify_payment_transaction(uuid, text, numeric, text, uuid) from public;
grant execute on function public.verify_payment_transaction(uuid, text, numeric, text, uuid) to service_role;
