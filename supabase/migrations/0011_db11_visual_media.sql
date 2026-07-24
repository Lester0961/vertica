-- =====================================================================
-- DB-11 — Visual media and 3D
-- building_models, unit_visual_positions, unit_images, floor_plans,
-- panorama_tours, panorama_scenes + RLS
-- =====================================================================

create table if not exists public.building_models (
  id            uuid primary key default gen_random_uuid(),
  building_id   uuid not null references public.buildings (id) on delete cascade,
  model_version text not null,
  glb_path      text not null,
  poster_path   text,
  byte_size     bigint check (byte_size >= 0),
  checksum      text,
  is_active     boolean not null default false,
  rights_note   text,
  performance_note text,
  created_at    timestamptz not null default now(),
  unique (building_id, model_version)
);
create unique index if not exists building_models_single_active
  on public.building_models (building_id) where is_active;

create table if not exists public.unit_visual_positions (
  id            uuid primary key default gen_random_uuid(),
  building_model_id uuid not null references public.building_models (id) on delete cascade,
  unit_id       uuid not null references public.units (id) on delete cascade,
  position      jsonb,
  rotation      jsonb,
  scale         jsonb,
  mesh_id       text,
  created_at    timestamptz not null default now(),
  unique (building_model_id, unit_id)
);

create table if not exists public.unit_images (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid references public.units (id) on delete cascade,
  unit_type_id  uuid references public.unit_types (id) on delete cascade,
  storage_path  text not null,
  alt_text      text,
  caption       text,
  display_order int not null default 0,
  image_type    text not null default 'interior'
                  check (image_type in ('facade','interior','view','amenity')),
  rights_source text,
  is_public     boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint image_target check (unit_id is not null or unit_type_id is not null)
);
create index if not exists unit_images_unit_idx on public.unit_images (unit_id, display_order);
create index if not exists unit_images_type_idx on public.unit_images (unit_type_id, display_order);

create table if not exists public.floor_plans (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid references public.units (id) on delete cascade,
  unit_type_id  uuid references public.unit_types (id) on delete cascade,
  storage_path  text not null,
  width_px      int,
  height_px     int,
  version       text,
  accessibility_description text,
  created_at    timestamptz not null default now(),
  constraint plan_target check (unit_id is not null or unit_type_id is not null)
);

create table if not exists public.panorama_tours (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid references public.units (id) on delete cascade,
  unit_type_id  uuid references public.unit_types (id) on delete cascade,
  version       text not null,
  is_active     boolean not null default false,
  poster_path   text,
  scene_count   int not null default 0 check (scene_count >= 0),
  created_at    timestamptz not null default now(),
  constraint tour_target check (unit_id is not null or unit_type_id is not null)
);

create table if not exists public.panorama_scenes (
  id            uuid primary key default gen_random_uuid(),
  tour_id       uuid not null references public.panorama_tours (id) on delete cascade,
  image_path    text not null,
  title         text,
  scene_order   int not null default 0,
  initial_camera jsonb,
  hotspots      jsonb,
  performance_note text,
  created_at    timestamptz not null default now()
);
create index if not exists panorama_scenes_tour_idx on public.panorama_scenes (tour_id, scene_order);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.building_models enable row level security;
alter table public.unit_visual_positions enable row level security;
alter table public.unit_images enable row level security;
alter table public.floor_plans enable row level security;
alter table public.panorama_tours enable row level security;
alter table public.panorama_scenes enable row level security;

-- Public may read active/public media; admins manage.
drop policy if exists bm_read on public.building_models;
create policy bm_read on public.building_models for select using (is_active or app.is_admin());
drop policy if exists bm_write on public.building_models;
create policy bm_write on public.building_models for all
  using (app.is_admin()) with check (app.is_admin());

drop policy if exists uvp_read on public.unit_visual_positions;
create policy uvp_read on public.unit_visual_positions for select using (true);
drop policy if exists uvp_write on public.unit_visual_positions;
create policy uvp_write on public.unit_visual_positions for all
  using (app.is_admin()) with check (app.is_admin());

drop policy if exists ui_read on public.unit_images;
create policy ui_read on public.unit_images for select using (is_public or app.is_admin());
drop policy if exists ui_write on public.unit_images;
create policy ui_write on public.unit_images for all
  using (app.is_admin()) with check (app.is_admin());

drop policy if exists fp_read on public.floor_plans;
create policy fp_read on public.floor_plans for select using (true);
drop policy if exists fp_write on public.floor_plans;
create policy fp_write on public.floor_plans for all
  using (app.is_admin()) with check (app.is_admin());

drop policy if exists pt_read on public.panorama_tours;
create policy pt_read on public.panorama_tours for select using (is_active or app.is_admin());
drop policy if exists pt_write on public.panorama_tours;
create policy pt_write on public.panorama_tours for all
  using (app.is_admin()) with check (app.is_admin());

drop policy if exists ps_read on public.panorama_scenes;
create policy ps_read on public.panorama_scenes for select
  using (
    app.is_admin() or exists (
      select 1 from public.panorama_tours t
      where t.id = panorama_scenes.tour_id and t.is_active
    )
  );
drop policy if exists ps_write on public.panorama_scenes;
create policy ps_write on public.panorama_scenes for all
  using (app.is_admin()) with check (app.is_admin());
