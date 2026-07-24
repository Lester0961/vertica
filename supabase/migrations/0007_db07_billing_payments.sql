-- =====================================================================
-- DB-07 — Billing and payments
-- bills, bill_items, payments, payment_proofs, payment_allocations,
-- payment_verification_history + RLS
-- =====================================================================

create table if not exists public.bills (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete restrict,
  lease_id      uuid not null references public.leases (id) on delete restrict,
  period_start  date not null,
  period_end    date not null,
  issue_date    date,
  due_date      date,
  accounting_status app.bill_status not null default 'DRAFT',
  display_status text,
  total_debit   numeric(12,2) not null default 0 check (total_debit >= 0),
  total_credit  numeric(12,2) not null default 0 check (total_credit >= 0),
  total_amount  numeric(12,2) not null default 0,
  paid_amount   numeric(12,2) not null default 0 check (paid_amount >= 0),
  balance       numeric(12,2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint bill_period check (period_end >= period_start)
);
create unique index if not exists bills_lease_period_unique
  on public.bills (lease_id, period_start, period_end);
create index if not exists bills_tenant_idx on public.bills (tenant_id);
create index if not exists bills_status_idx on public.bills (accounting_status);

drop trigger if exists trg_bills_updated_at on public.bills;
create trigger trg_bills_updated_at before update on public.bills
  for each row execute function app.set_updated_at();

create table if not exists public.bill_items (
  id            uuid primary key default gen_random_uuid(),
  bill_id       uuid not null references public.bills (id) on delete cascade,
  item_code     text not null,
  description   text not null,
  quantity      numeric(12,2) not null default 1 check (quantity > 0),
  rate          numeric(12,2) not null,
  amount        numeric(12,2) not null check (amount >= 0),
  effect        app.bill_item_effect not null,
  source_entity text,
  source_id     uuid,
  line_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists bill_items_bill_idx on public.bill_items (bill_id, line_order);

create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete restrict,
  bill_id       uuid references public.bills (id),
  submitted_amount numeric(12,2) not null check (submitted_amount > 0),
  approved_amount  numeric(12,2) check (approved_amount >= 0),
  method        text not null,
  external_reference text,
  status        app.payment_status not null default 'SUBMITTED',
  status_version int not null default 1,
  submitted_at  timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid references public.profiles (id),
  decision_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists payments_tenant_idx on public.payments (tenant_id);
create index if not exists payments_status_idx on public.payments (status);
-- Duplicate external-reference control (per tenant, when provided).
create unique index if not exists payments_ext_ref_unique
  on public.payments (tenant_id, external_reference)
  where external_reference is not null;

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at before update on public.payments
  for each row execute function app.set_updated_at();

create table if not exists public.payment_proofs (
  id            uuid primary key default gen_random_uuid(),
  payment_id    uuid not null references public.payments (id) on delete cascade,
  storage_path  text not null,
  mime_type     text,
  byte_size     bigint check (byte_size >= 0),
  checksum      text,
  uploaded_by   uuid references public.profiles (id),
  uploaded_at   timestamptz not null default now(),
  scan_status   text not null default 'PENDING'
                  check (scan_status in ('PENDING','CLEAN','INFECTED','ERROR'))
);
create index if not exists payment_proofs_payment_idx on public.payment_proofs (payment_id);

create table if not exists public.payment_allocations (
  id            uuid primary key default gen_random_uuid(),
  payment_id    uuid not null references public.payments (id) on delete cascade,
  bill_id       uuid not null references public.bills (id),
  amount        numeric(12,2) not null check (amount > 0),
  reversed_by   uuid references public.payment_allocations (id),
  created_at    timestamptz not null default now()
);
create index if not exists pay_alloc_payment_idx on public.payment_allocations (payment_id);
create index if not exists pay_alloc_bill_idx on public.payment_allocations (bill_id);

create table if not exists public.payment_verification_history (
  id            uuid primary key default gen_random_uuid(),
  payment_id    uuid not null references public.payments (id) on delete cascade,
  previous_status app.payment_status,
  next_status   app.payment_status not null,
  reviewer_id   uuid references public.profiles (id),
  reason        text,
  amount_approved numeric(12,2),
  created_at    timestamptz not null default now()
);
create index if not exists pvh_payment_idx on public.payment_verification_history (payment_id, created_at desc);

drop trigger if exists trg_pvh_no_mutation on public.payment_verification_history;
create trigger trg_pvh_no_mutation
  before update or delete on public.payment_verification_history
  for each row execute function app.prevent_mutation();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.bills enable row level security;
alter table public.bill_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.payment_verification_history enable row level security;

-- bills: tenant reads own; admin manages.
drop policy if exists bills_self_read on public.bills;
create policy bills_self_read on public.bills for select
  using (app.is_admin() or app.owns_tenant(tenant_id));
drop policy if exists bills_admin_write on public.bills;
create policy bills_admin_write on public.bills for all
  using (app.is_admin()) with check (app.is_admin());

-- bill_items: readable if parent bill readable; admin writes.
drop policy if exists bill_items_read on public.bill_items;
create policy bill_items_read on public.bill_items for select
  using (
    app.is_admin() or exists (
      select 1 from public.bills b
      where b.id = bill_items.bill_id and app.owns_tenant(b.tenant_id)
    )
  );
drop policy if exists bill_items_admin_write on public.bill_items;
create policy bill_items_admin_write on public.bill_items for all
  using (app.is_admin()) with check (app.is_admin());

-- payments: tenant reads/creates own; admin manages review.
drop policy if exists payments_self_read on public.payments;
create policy payments_self_read on public.payments for select
  using (app.is_admin() or app.owns_tenant(tenant_id));
drop policy if exists payments_self_insert on public.payments;
create policy payments_self_insert on public.payments for insert
  with check (app.owns_tenant(tenant_id));
drop policy if exists payments_admin_write on public.payments;
create policy payments_admin_write on public.payments for update
  using (app.is_admin()) with check (app.is_admin());

-- payment_proofs: tenant reads/creates own; admin reads.
drop policy if exists proofs_read on public.payment_proofs;
create policy proofs_read on public.payment_proofs for select
  using (
    app.is_admin() or exists (
      select 1 from public.payments p
      where p.id = payment_proofs.payment_id and app.owns_tenant(p.tenant_id)
    )
  );
drop policy if exists proofs_self_insert on public.payment_proofs;
create policy proofs_self_insert on public.payment_proofs for insert
  with check (
    exists (
      select 1 from public.payments p
      where p.id = payment_proofs.payment_id and app.owns_tenant(p.tenant_id)
    )
  );

-- payment_allocations + verification history: admin only (tenant reads own via join).
drop policy if exists pay_alloc_read on public.payment_allocations;
create policy pay_alloc_read on public.payment_allocations for select
  using (
    app.is_admin() or exists (
      select 1 from public.payments p
      where p.id = payment_allocations.payment_id and app.owns_tenant(p.tenant_id)
    )
  );
drop policy if exists pay_alloc_admin_write on public.payment_allocations;
create policy pay_alloc_admin_write on public.payment_allocations for all
  using (app.is_admin()) with check (app.is_admin());

drop policy if exists pvh_read on public.payment_verification_history;
create policy pvh_read on public.payment_verification_history for select
  using (
    app.is_admin() or exists (
      select 1 from public.payments p
      where p.id = payment_verification_history.payment_id and app.owns_tenant(p.tenant_id)
    )
  );
drop policy if exists pvh_admin_insert on public.payment_verification_history;
create policy pvh_admin_insert on public.payment_verification_history for insert
  with check (app.is_admin());
