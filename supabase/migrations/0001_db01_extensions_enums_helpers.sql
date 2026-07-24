-- =====================================================================
-- DB-01 — Extensions, enums, and common helpers
-- Forward-only migration. Never edit after it is applied to a shared DB.
-- Time zone policy: store UTC (timestamptz), render in Asia/Manila.
-- Money precision policy: numeric(12,2).
-- =====================================================================

-- --- Extensions ---------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid(), digest()
create extension if not exists "citext";        -- case-insensitive email
create extension if not exists "btree_gist";    -- exclusion constraints

-- --- Schema for internal helpers ---------------------------------------
create schema if not exists app;

-- anon/authenticated must be able to reference app-schema enum types (used as
-- column types) and call the SECURITY DEFINER helper functions used in RLS.
grant usage on schema app to anon, authenticated, service_role;

-- --- Status enums -------------------------------------------------------
do $$ begin
  create type app.unit_status as enum (
    'DRAFT', 'AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.inquiry_status as enum (
    'NEW', 'CONTACTED', 'FOLLOW_UP', 'QUALIFIED', 'CONVERTED', 'CLOSED_LOST'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.request_status as enum (
    'REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.appointment_status as enum (
    'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.reservation_status as enum (
    'ACTIVE', 'CONVERTED', 'EXPIRED', 'CANCELLED', 'REJECTED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.lease_status as enum (
    'DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED', 'RENEWED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.bill_status as enum (
    'DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.payment_status as enum (
    'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'REVERSED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.maintenance_status as enum (
    'SUBMITTED', 'TRIAGED', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS',
    'ON_HOLD', 'COMPLETED', 'CLOSED', 'REJECTED', 'CANCELLED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.gate_pass_status as enum (
    'ACTIVE', 'USED', 'EXPIRED', 'REVOKED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.bill_item_effect as enum ('DEBIT', 'CREDIT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.compliance_outcome as enum (
    'PASS', 'FAIL', 'REVIEW_REQUIRED', 'NOT_APPLICABLE'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.app_role as enum (
    'SUPER_ADMIN', 'PROPERTY_ADMIN', 'TENANT', 'GUARD', 'MAINTENANCE'
  );
exception when duplicate_object then null; end $$;

-- --- updated_at trigger helper -----------------------------------------
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- --- Immutable-history helper: block UPDATE/DELETE on append-only tables -
create or replace function app.prevent_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Rows in % are append-only and cannot be % .',
    tg_table_name, tg_op
    using errcode = 'restrict_violation';
end;
$$;

-- --- Role helpers (SECURITY DEFINER to safely read user_roles under RLS) -
-- Defined here as stubs referencing app.user_roles which is created in DB-02.
-- We (re)create them in DB-02 once the table exists. Placeholder avoided to
-- keep dependencies forward-only; see 0002.

comment on schema app is 'Internal Vertica helpers, enums, and security functions.';
