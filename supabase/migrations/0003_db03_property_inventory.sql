-- =====================================================================
-- DB-03 — Property and inventory
-- buildings, floors, unit_types, units, unit_features,
-- unit_feature_values, unit_status_events + RLS
-- =====================================================================

-- --- buildings ---------------------------------------------------------
create table if not exists public.buildings (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  address       text,
  latitude      numeric(9,6),
  longitude     numeric(9,6),
  time_zone     text not null default 'Asia/Manila',
  status        text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  public_description text,
  brand_tagline text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_buildings_updated_at on public.buildings;
create trigger trg_buildings_updated_at before update on public.buildings
  for each row execute function app.set_updated_at();

-- --- floors ------------------------------------------------------------
create table if not exists public.floors (
  id            uuid primary key default gen_random_uuid(),
  building_id   uuid not null references public.buildings (id) on delete cascade,
  floor_number  int not null,
  public_label  text not null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (building_id, floor_number)
);

drop trigger if exists trg_floors_updated_at on public.floors;
create trigger trg_floors_updated_at before update on public.floors
  for each row execute function app.set_updated_at();

-- --- unit_types --------------------------------------------------------
create table if not exists public.unit_types (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  name            text not null,
  bedrooms        int not null default 0 check (bedrooms >= 0),
  bathrooms       numeric(3,1) not null default 1 check (bathrooms >= 0),
  base_area_sqm   numeric(8,2) check (base_area_sqm > 0),
  capacity        int check (capacity > 0),
  default_dues    numeric(12,2) not null default 0 check (default_dues >= 0),
  public_description text,
  min_area_sqm    numeric(8,2),
  max_area_sqm    numeric(8,2),
  min_rent        numeric(12,2),
  max_rent        numeric(12,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_unit_types_updated_at on public.unit_types;
create trigger trg_unit_types_updated_at before update on public.unit_types
  for each row execute function app.set_updated_at();

-- --- units -------------------------------------------------------------
create table if not exists public.units (
  id                uuid primary key default gen_random_uuid(),
  building_id       uuid not null references public.buildings (id) on delete restrict,
  floor_id          uuid not null references public.floors (id) on delete restrict,
  unit_type_id      uuid not null references public.unit_types (id) on delete restrict,
  unit_number       text not null,
  public_label      text not null,
  area_sqm          numeric(8,2) not null check (area_sqm > 0),
  monthly_rent      numeric(12,2) not null check (monthly_rent >= 0),
  monthly_dues      numeric(12,2) not null default 0 check (monthly_dues >= 0),
  available_from    date,
  min_lease_months  int not null default 12 check (min_lease_months > 0),
  status            app.unit_status not null default 'DRAFT',
  status_version    int not null default 1,
  is_public         boolean not null default false,
  furnishing        text check (furnishing in ('UNFURNISHED','SEMI_FURNISHED','FURNISHED')),
  capacity          int check (capacity > 0),
  orientation       text,
  display_order     int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (building_id, unit_number),
  unique (public_label)
);

create index if not exists units_status_idx on public.units (status);
create index if not exists units_available_from_idx on public.units (available_from);
create index if not exists units_rent_idx on public.units (monthly_rent);
create index if not exists units_type_idx on public.units (unit_type_id);
create index if not exists units_floor_idx on public.units (floor_id);
create index if not exists units_public_idx on public.units (is_public) where is_public;

drop trigger if exists trg_units_updated_at on public.units;
create trigger trg_units_updated_at before update on public.units
  for each row execute function app.set_updated_at();

-- --- unit_features (dictionary) ----------------------------------------
create table if not exists public.unit_features (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  label         text not null,
  data_type     text not null check (data_type in ('boolean','enum','ordinal','numeric','text')),
  is_public     boolean not null default true,
  dss_participates boolean not null default false,
  enum_values   jsonb,
  min_value     numeric,
  max_value     numeric,
  created_at    timestamptz not null default now()
);

-- --- unit_feature_values -----------------------------------------------
create table if not exists public.unit_feature_values (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references public.units (id) on delete cascade,
  feature_id    uuid not null references public.unit_features (id) on delete cascade,
  value_boolean boolean,
  value_numeric numeric,
  value_text    text,
  updated_at    timestamptz not null default now(),
  unique (unit_id, feature_id),
  -- exactly one typed value populated
  constraint one_typed_value check (
    (value_boolean is not null)::int
    + (value_numeric is not null)::int
    + (value_text is not null)::int = 1
  )
);

create index if not exists ufv_unit_idx on public.unit_feature_values (unit_id);
create index if not exists ufv_feature_idx on public.unit_feature_values (feature_id);

drop trigger if exists trg_ufv_updated_at on public.unit_feature_values;
create trigger trg_ufv_updated_at before update on public.unit_feature_values
  for each row execute function app.set_updated_at();

-- --- unit_status_events (append-only) ----------------------------------
create table if not exists public.unit_status_events (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references public.units (id) on delete cascade,
  previous_status app.unit_status,
  next_status   app.unit_status not null,
  source_entity text,
  source_id     uuid,
  actor_id      uuid references public.profiles (id),
  reason        text,
  request_id    uuid,
  created_at    timestamptz not null default now()
);

create index if not exists use_unit_idx on public.unit_status_events (unit_id, created_at desc);

drop trigger if exists trg_use_no_mutation on public.unit_status_events;
create trigger trg_use_no_mutation
  before update or delete on public.unit_status_events
  for each row execute function app.prevent_mutation();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.buildings enable row level security;
alter table public.floors enable row level security;
alter table public.unit_types enable row level security;
alter table public.units enable row level security;
alter table public.unit_features enable row level security;
alter table public.unit_feature_values enable row level security;
alter table public.unit_status_events enable row level security;

-- Public marketing data readable by everyone (anon + authenticated).
drop policy if exists buildings_public_read on public.buildings;
create policy buildings_public_read on public.buildings for select using (true);
drop policy if exists buildings_admin_write on public.buildings;
create policy buildings_admin_write on public.buildings for all
  using (app.is_admin()) with check (app.is_admin());

drop policy if exists floors_public_read on public.floors;
create policy floors_public_read on public.floors for select using (true);
drop policy if exists floors_admin_write on public.floors;
create policy floors_admin_write on public.floors for all
  using (app.is_admin()) with check (app.is_admin());

drop policy if exists unit_types_public_read on public.unit_types;
create policy unit_types_public_read on public.unit_types for select using (true);
drop policy if exists unit_types_admin_write on public.unit_types;
create policy unit_types_admin_write on public.unit_types for all
  using (app.is_admin()) with check (app.is_admin());

-- units: public sees only public units; admins see all and manage.
drop policy if exists units_public_read on public.units;
create policy units_public_read on public.units for select
  using (is_public or app.is_admin());
drop policy if exists units_admin_write on public.units;
create policy units_admin_write on public.units for all
  using (app.is_admin()) with check (app.is_admin());

-- unit_features: public reads public features; admins manage.
drop policy if exists uf_public_read on public.unit_features;
create policy uf_public_read on public.unit_features for select
  using (is_public or app.is_admin());
drop policy if exists uf_admin_write on public.unit_features;
create policy uf_admin_write on public.unit_features for all
  using (app.is_admin()) with check (app.is_admin());

-- unit_feature_values: public reads values for public units + public features.
drop policy if exists ufv_public_read on public.unit_feature_values;
create policy ufv_public_read on public.unit_feature_values for select
  using (
    app.is_admin() or exists (
      select 1 from public.units u
      join public.unit_features f on f.id = unit_feature_values.feature_id
      where u.id = unit_feature_values.unit_id and u.is_public and f.is_public
    )
  );
drop policy if exists ufv_admin_write on public.unit_feature_values;
create policy ufv_admin_write on public.unit_feature_values for all
  using (app.is_admin()) with check (app.is_admin());

-- unit_status_events: admins only.
drop policy if exists use_admin_read on public.unit_status_events;
create policy use_admin_read on public.unit_status_events for select
  using (app.is_admin());
drop policy if exists use_admin_insert on public.unit_status_events;
create policy use_admin_insert on public.unit_status_events for insert
  with check (app.is_admin());
