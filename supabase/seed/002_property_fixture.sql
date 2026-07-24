-- =====================================================================
-- SEED 002 — Property fixture (SYNTHETIC / demo)
-- One fictional building, floors 2-7, three unit types.
-- Deterministic UUIDs so downstream seeds/tests can reference them.
-- =====================================================================

insert into public.buildings (id, code, name, address, latitude, longitude, time_zone, public_description, brand_tagline)
values (
  '00000000-0000-0000-0000-0000000b0001',
  'VERTICA-1',
  'Vertica Residences',
  '123 Fictional Avenue, Demo City',
  14.554700, 121.024500,
  'Asia/Manila',
  'A mid-rise residential building with 24 thoughtfully planned residences across floors 2 to 7.',
  'A smarter way to rent.'
)
on conflict (id) do nothing;

-- Unit types
insert into public.unit_types (id, code, name, bedrooms, bathrooms, base_area_sqm, capacity, default_dues, public_description, min_area_sqm, max_area_sqm, min_rent, max_rent)
values
  ('00000000-0000-0000-0000-0000000a0001','STUDIO','Studio',0,1,26.00,2,1500,'Efficient open layout for one or two occupants.',24,30,15000,19000),
  ('00000000-0000-0000-0000-0000000a0002','1BR','One-Bedroom',1,1,38.00,3,2200,'Defined sleeping area with better work/rest separation.',34,44,22000,28000),
  ('00000000-0000-0000-0000-0000000a0003','2BR','Two-Bedroom',2,2,58.00,5,3200,'Higher capacity with a dedicated extra room.',52,66,34000,42000)
on conflict (id) do nothing;

-- Floors 2-7
insert into public.floors (id, building_id, floor_number, public_label, sort_order)
values
  ('00000000-0000-0000-0000-0000000f0002','00000000-0000-0000-0000-0000000b0001',2,'2nd Floor',2),
  ('00000000-0000-0000-0000-0000000f0003','00000000-0000-0000-0000-0000000b0001',3,'3rd Floor',3),
  ('00000000-0000-0000-0000-0000000f0004','00000000-0000-0000-0000-0000000b0001',4,'4th Floor',4),
  ('00000000-0000-0000-0000-0000000f0005','00000000-0000-0000-0000-0000000b0001',5,'5th Floor',5),
  ('00000000-0000-0000-0000-0000000f0006','00000000-0000-0000-0000-0000000b0001',6,'6th Floor',6),
  ('00000000-0000-0000-0000-0000000f0007','00000000-0000-0000-0000-0000000b0001',7,'7th Floor',7)
on conflict (id) do nothing;
