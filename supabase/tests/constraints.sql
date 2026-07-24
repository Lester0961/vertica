-- pgTAP: schema + constraint invariants. Run with `supabase test db`.
begin;
select plan(16);

-- Core tables exist.
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'units', 'units table exists');
select has_table('public', 'leases', 'leases table exists');
select has_table('public', 'bills', 'bills table exists');
select has_table('public', 'audit_logs', 'audit_logs table exists');

-- Primary keys.
select col_is_pk('public', 'profiles', 'id', 'profiles.id is PK');
select col_is_pk('public', 'units', 'id', 'units.id is PK');

-- Unique business identities.
select ok(
  (select count(*) from pg_indexes
   where schemaname = 'public' and indexname = 'units_public_idx') >= 0,
  'units public index present'
);
select col_has_check('public', 'units', 'area_sqm', 'units.area_sqm has check constraint');

-- No overlapping active leases: exclusion constraint present.
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'leases_no_overlap' and contype = 'x'
  ),
  'leases_no_overlap exclusion constraint exists'
);

-- One active reservation per unit: partial unique index present.
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'reservations_active_unit_unique'
  ),
  'reservations active-unit unique index exists'
);

-- Legal rule fail-closed: active requires verified.
select ok(
  exists (
    select 1 from pg_constraint where conname = 'active_requires_verified'
  ),
  'legal_rule_sets active-requires-verified constraint exists'
);

-- Seed integrity: exactly 24 units.
select is(
  (select count(*)::int from public.units),
  24,
  'exactly 24 units seeded'
);

-- Seeded available units are public.
select ok(
  (select count(*) from public.units where status = 'AVAILABLE' and not is_public) = 0,
  'no AVAILABLE unit is hidden from public'
);

-- Non-available units are not public.
select ok(
  (select count(*) from public.units where status <> 'AVAILABLE' and is_public) = 0,
  'no non-AVAILABLE unit is public'
);

-- Legal rules remain inactive (compliance fails closed).
select is(
  (select count(*)::int from public.legal_rule_sets where is_active),
  0,
  'no active legal rule set (fails closed until verified)'
);

select * from finish();
rollback;
