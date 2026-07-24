-- =====================================================================
-- DB-12 — Enable anonymous recommendation capture (audit trail)
-- Allows anonymous guests to insert recommendation sessions/results/
-- candidates (write-only; reads remain admin/owner only). No PII is stored:
-- only hashed questionnaire answers and scoring output. The active config
-- ('v1') is seeded by 001_reference_data.sql.
-- =====================================================================

-- Anonymous guests may create sessions (write-only). Reads stay admin/owner.
drop policy if exists rec_sessions_anon_insert on public.recommendation_sessions;
create policy rec_sessions_anon_insert on public.recommendation_sessions for insert
  to anon, authenticated
  with check (true);

drop policy if exists rec_results_anon_insert on public.recommendation_results;
create policy rec_results_anon_insert on public.recommendation_results for insert
  to anon, authenticated
  with check (true);

drop policy if exists rec_candidates_anon_insert on public.recommendation_candidates;
create policy rec_candidates_anon_insert on public.recommendation_candidates for insert
  to anon, authenticated
  with check (true);

drop policy if exists rec_hfr_anon_insert on public.recommendation_hard_filter_results;
create policy rec_hfr_anon_insert on public.recommendation_hard_filter_results for insert
  to anon, authenticated
  with check (true);
