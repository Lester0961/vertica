-- =====================================================================
-- DB-04 — DSS and recommendations
-- recommendation_configs, recommendation_sessions, recommendation_candidates,
-- recommendation_hard_filter_results, recommendation_results,
-- recommendation_score_details + RLS
-- =====================================================================

create table if not exists public.recommendation_configs (
  id            uuid primary key default gen_random_uuid(),
  version       text not null unique,
  base_weights  jsonb not null,
  priority_multipliers jsonb not null,
  formula       jsonb not null,
  is_active     boolean not null default false,
  activated_by  uuid references public.profiles (id),
  activated_at  timestamptz,
  created_at    timestamptz not null default now()
);
-- exactly one active config
create unique index if not exists rec_config_single_active
  on public.recommendation_configs (is_active) where is_active;

create table if not exists public.recommendation_sessions (
  id            uuid primary key default gen_random_uuid(),
  config_version text not null references public.recommendation_configs (version),
  questionnaire jsonb not null,
  secret_hash   text not null,
  user_id       uuid references public.profiles (id),
  client_id     uuid,
  privacy_notice_version text,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  completed_at  timestamptz
);
create index if not exists rec_sessions_expiry_idx on public.recommendation_sessions (expires_at);
create index if not exists rec_sessions_user_idx on public.recommendation_sessions (user_id);

create table if not exists public.recommendation_candidates (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.recommendation_sessions (id) on delete cascade,
  unit_id       uuid not null references public.units (id),
  unit_snapshot jsonb not null,
  is_eligible   boolean not null,
  evaluation_order int not null,
  created_at    timestamptz not null default now(),
  unique (session_id, unit_id)
);
create index if not exists rec_candidates_session_idx on public.recommendation_candidates (session_id, evaluation_order);

create table if not exists public.recommendation_hard_filter_results (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  uuid not null references public.recommendation_candidates (id) on delete cascade,
  rule_code     text not null,
  passed        boolean not null,
  observed_value text,
  required_value text,
  created_at    timestamptz not null default now(),
  unique (candidate_id, rule_code)
);

create table if not exists public.recommendation_results (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.recommendation_sessions (id) on delete cascade,
  unit_id       uuid not null references public.units (id),
  rank          int not null,
  score         numeric(8,4) not null,
  band          text,
  diversity_label text,
  explanation   text,
  config_version text not null,
  unit_snapshot jsonb not null,
  created_at    timestamptz not null default now(),
  unique (session_id, rank),
  unique (session_id, unit_id)
);
create index if not exists rec_results_session_idx on public.recommendation_results (session_id, rank);

create table if not exists public.recommendation_score_details (
  id            uuid primary key default gen_random_uuid(),
  result_id     uuid not null references public.recommendation_results (id) on delete cascade,
  group_code    text not null,
  raw_score     numeric(8,4) not null,
  effective_weight numeric(8,4) not null,
  weighted_contribution numeric(8,4) not null,
  formula_trace jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists rec_score_details_result_idx on public.recommendation_score_details (result_id);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.recommendation_configs enable row level security;
alter table public.recommendation_sessions enable row level security;
alter table public.recommendation_candidates enable row level security;
alter table public.recommendation_hard_filter_results enable row level security;
alter table public.recommendation_results enable row level security;
alter table public.recommendation_score_details enable row level security;

-- Config: admins read; only super admin writes.
drop policy if exists rec_config_read on public.recommendation_configs;
create policy rec_config_read on public.recommendation_configs for select
  using (app.is_admin());
drop policy if exists rec_config_write on public.recommendation_configs;
create policy rec_config_write on public.recommendation_configs for all
  using (app.is_super_admin()) with check (app.is_super_admin());

-- Sessions and results: created by the server (service role) for anonymous
-- guests. Authenticated owners and admins may read their own. Anonymous access
-- is mediated by the API using the session secret, not by RLS.
drop policy if exists rec_sessions_owner_read on public.recommendation_sessions;
create policy rec_sessions_owner_read on public.recommendation_sessions for select
  using (app.is_admin() or (user_id is not null and user_id = auth.uid()));

drop policy if exists rec_results_owner_read on public.recommendation_results;
create policy rec_results_owner_read on public.recommendation_results for select
  using (
    app.is_admin() or exists (
      select 1 from public.recommendation_sessions s
      where s.id = recommendation_results.session_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists rec_candidates_admin_read on public.recommendation_candidates;
create policy rec_candidates_admin_read on public.recommendation_candidates for select
  using (app.is_admin());

drop policy if exists rec_hfr_admin_read on public.recommendation_hard_filter_results;
create policy rec_hfr_admin_read on public.recommendation_hard_filter_results for select
  using (app.is_admin());

drop policy if exists rec_score_details_read on public.recommendation_score_details;
create policy rec_score_details_read on public.recommendation_score_details for select
  using (
    app.is_admin() or exists (
      select 1 from public.recommendation_results r
      join public.recommendation_sessions s on s.id = r.session_id
      where r.id = recommendation_score_details.result_id
        and s.user_id = auth.uid()
    )
  );
