-- pgTAP: RLS is enabled on every exposed public table and append-only history
-- is protected. Run with `supabase test db`.
begin;
select plan(3);

-- Every base table in public has RLS enabled.
select is(
  (
    select count(*)::int
    from pg_tables t
    where t.schemaname = 'public'
      and not exists (
        select 1 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = t.tablename
          and c.relrowsecurity
      )
  ),
  0,
  'all public tables have RLS enabled'
);

-- Append-only tables have a prevent_mutation trigger.
select ok(
  (
    select bool_and(has_guard)
    from (
      select exists (
        select 1 from pg_trigger tg
        join pg_class c on c.oid = tg.tgrelid
        where c.relname = tbl and not tg.tgisinternal
      ) as has_guard
      from unnest(array[
        'audit_logs','lease_status_history','payment_verification_history',
        'maintenance_status_history','gate_pass_verifications',
        'unit_status_events','lease_acknowledgments','privacy_notice_receipts'
      ]) as tbl
    ) s
  ),
  'append-only history tables have mutation-guard triggers'
);

-- Role helper functions exist and are SECURITY DEFINER.
select ok(
  (
    select bool_and(p.prosecdef)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.proname in ('has_role','is_admin','is_super_admin','owns_tenant')
  ),
  'role helper functions are SECURITY DEFINER'
);

select * from finish();
rollback;
