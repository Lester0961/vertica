-- =====================================================================
-- SEED 003 — Unit fixture (SYNTHETIC / demo)
-- 24 units: floors 2-7 x 4 units. Per floor: 2 Studio, 1 One-BR, 1 Two-BR.
-- Deterministic layout; a few units set to non-available for realistic states.
-- =====================================================================

do $$
declare
  b_id uuid := '00000000-0000-0000-0000-0000000b0001';
  t_studio uuid := '00000000-0000-0000-0000-0000000a0001';
  t_1br    uuid := '00000000-0000-0000-0000-0000000a0002';
  t_2br    uuid := '00000000-0000-0000-0000-0000000a0003';
  fl int;
  n  int;
  f_id uuid;
  ut_id uuid;
  area numeric;
  rent numeric;
  dues numeric;
  cap int;
  st app.unit_status;
  unum text;
  floor_premium numeric;
begin
  for fl in 2..7 loop
    f_id := ('00000000-0000-0000-0000-0000000f000' || fl)::uuid;
    floor_premium := (fl - 2) * 800;  -- higher floors cost a bit more
    for n in 1..4 loop
      unum := (fl * 100 + n)::text;

      if n in (1, 2) then
        ut_id := t_studio; area := 26 + n; rent := 16000 + floor_premium; dues := 1500; cap := 2;
      elsif n = 3 then
        ut_id := t_1br; area := 38; rent := 24000 + floor_premium; dues := 2200; cap := 3;
      else
        ut_id := t_2br; area := 58; rent := 36000 + floor_premium; dues := 3200; cap := 5;
      end if;

      -- Deterministic non-available states for realism.
      if fl = 2 and n = 1 then st := 'OCCUPIED';
      elsif fl = 3 and n = 4 then st := 'MAINTENANCE';
      elsif fl = 4 and n = 2 then st := 'RESERVED';
      elsif fl = 5 and n = 1 then st := 'OCCUPIED';
      else st := 'AVAILABLE';
      end if;

      insert into public.units (
        building_id, floor_id, unit_type_id, unit_number, public_label,
        area_sqm, monthly_rent, monthly_dues, available_from, min_lease_months,
        status, is_public, furnishing, capacity, display_order
      ) values (
        b_id, f_id, ut_id, unum, 'Unit ' || unum,
        area, rent, dues,
        case when st = 'AVAILABLE' then current_date + ((n) * 7) else null end,
        12, st, (st = 'AVAILABLE'),
        case when n = 4 then 'SEMI_FURNISHED' else 'UNFURNISHED' end,
        cap, fl * 10 + n
      )
      on conflict (building_id, unit_number) do nothing;
    end loop;
  end loop;
end $$;

-- Feature values for available/public units (public + DSS-visible).
insert into public.unit_feature_values (unit_id, feature_id, value_boolean)
select u.id, f.id, (u.display_order % 2 = 0)
from public.units u
cross join public.unit_features f
where f.code in ('parking','pets_allowed','balcony','laundry_ready','internet_ready','accessible')
  and u.is_public
on conflict (unit_id, feature_id) do nothing;

insert into public.unit_feature_values (unit_id, feature_id, value_numeric)
select u.id, f.id,
  case f.code
    when 'workspace_level' then 1 + (u.display_order % 5)
    when 'cooking_level'   then 1 + ((u.display_order + 1) % 5)
    when 'quietness'       then 1 + ((u.display_order + 2) % 5)
    when 'ventilation'     then 1 + ((u.display_order + 3) % 5)
    when 'heat_exposure'   then 1 + ((u.display_order + 4) % 5)
    when 'privacy'         then 1 + (u.display_order % 5)
    when 'storage'         then 1 + ((u.display_order + 1) % 5)
    when 'elevator_distance' then 5 + (u.display_order % 40)
    else 3
  end
from public.units u
cross join public.unit_features f
where f.code in ('workspace_level','cooking_level','quietness','ventilation','heat_exposure','privacy','storage','elevator_distance')
  and u.is_public
on conflict (unit_id, feature_id) do nothing;
