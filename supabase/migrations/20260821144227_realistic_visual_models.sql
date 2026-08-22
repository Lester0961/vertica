-- =====================================================================
-- Realistic 3D runtime assets
-- Versioned unit/interior models + public visual-media bucket policies.
-- Building models and unit mesh positions already exist in DB-11.
-- =====================================================================

create table if not exists public.unit_models (
  id                uuid primary key default gen_random_uuid(),
  unit_type_id      uuid references public.unit_types (id) on delete cascade,
  unit_id           uuid references public.units (id) on delete cascade,
  model_version     text not null,
  glb_path          text not null,
  poster_path       text,
  collision_mesh_id text,
  camera_anchor     jsonb,
  hotspots          jsonb not null default '[]'::jsonb,
  variants          jsonb not null default '{}'::jsonb,
  byte_size         bigint check (byte_size is null or byte_size >= 0),
  checksum          text,
  is_active         boolean not null default false,
  rights_note       text,
  performance_note  text,
  created_at        timestamptz not null default now(),
  constraint unit_models_target check (num_nonnulls(unit_type_id, unit_id) = 1),
  constraint unit_models_hotspots_array check (jsonb_typeof(hotspots) = 'array'),
  constraint unit_models_variants_object check (jsonb_typeof(variants) = 'object')
);

create unique index if not exists unit_models_type_version_unique
  on public.unit_models (unit_type_id, model_version)
  where unit_type_id is not null and unit_id is null;

create unique index if not exists unit_models_unit_version_unique
  on public.unit_models (unit_id, model_version)
  where unit_id is not null;

create unique index if not exists unit_models_single_active_type
  on public.unit_models (unit_type_id)
  where unit_type_id is not null and unit_id is null and is_active;

create unique index if not exists unit_models_single_active_unit
  on public.unit_models (unit_id)
  where unit_id is not null and is_active;

alter table public.unit_models enable row level security;

drop policy if exists unit_models_public_read on public.unit_models;
create policy unit_models_public_read
  on public.unit_models for select
  to anon, authenticated
  using (is_active);

drop policy if exists unit_models_admin_insert on public.unit_models;
create policy unit_models_admin_insert
  on public.unit_models for insert
  to authenticated
  with check (app.is_admin());

drop policy if exists unit_models_admin_update on public.unit_models;
create policy unit_models_admin_update
  on public.unit_models for update
  to authenticated
  using (app.is_admin())
  with check (app.is_admin());

drop policy if exists unit_models_admin_delete on public.unit_models;
create policy unit_models_admin_delete
  on public.unit_models for delete
  to authenticated
  using (app.is_admin());

grant select on public.unit_models to anon, authenticated;
grant insert, update, delete on public.unit_models to authenticated;

-- Tighten public unit-position reads. The Next.js API uses the service role to
-- assemble a sanitized manifest; direct Data API reads reveal only active-model
-- positions belonging to available public units.
drop policy if exists uvp_read on public.unit_visual_positions;
drop policy if exists uvp_public_read on public.unit_visual_positions;
create policy uvp_public_read
  on public.unit_visual_positions for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.building_models model
      where model.id = unit_visual_positions.building_model_id
        and model.is_active
    )
    and exists (
      select 1
      from public.units unit_record
      where unit_record.id = unit_visual_positions.unit_id
        and unit_record.is_public
        and unit_record.status = 'AVAILABLE'
    )
  );

grant select on public.building_models to anon, authenticated;
grant select on public.unit_visual_positions to anon, authenticated;
grant select on public.floor_plans to anon, authenticated;
grant select on public.panorama_tours to anon, authenticated;
grant select on public.panorama_scenes to anon, authenticated;

-- Runtime visual assets are publicly cacheable. Upload, replacement, and
-- deletion still require explicit storage.objects RLS policies below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'visual-media',
  'visual-media',
  true,
  26214400,
  array[
    'model/gltf-binary',
    'model/gltf+json',
    'application/octet-stream',
    'image/avif',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists visual_media_admin_list on storage.objects;
create policy visual_media_admin_list
  on storage.objects for select
  to authenticated
  using (bucket_id = 'visual-media' and app.is_admin());

drop policy if exists visual_media_admin_insert on storage.objects;
create policy visual_media_admin_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'visual-media' and app.is_admin());

drop policy if exists visual_media_admin_update on storage.objects;
create policy visual_media_admin_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'visual-media' and app.is_admin())
  with check (bucket_id = 'visual-media' and app.is_admin());

drop policy if exists visual_media_admin_delete on storage.objects;
create policy visual_media_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'visual-media' and app.is_admin());
