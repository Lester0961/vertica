-- =====================================================================
-- SEED 001 — Reference data (SYNTHETIC / demo)
-- unit feature dictionary, active DSS config, draft (UNVERIFIED) legal rules,
-- system settings, privacy notice version.
-- =====================================================================

-- --- Unit feature dictionary -------------------------------------------
insert into public.unit_features (code, label, data_type, is_public, dss_participates)
values
  ('parking',        'Parking slot',        'boolean', true, true),
  ('pets_allowed',   'Pets allowed',        'boolean', true, true),
  ('balcony',        'Balcony',             'boolean', true, true),
  ('workspace_level','Workspace suitability','ordinal', true, true),
  ('cooking_level',  'Cooking suitability', 'ordinal', true, true),
  ('quietness',      'Quietness',           'ordinal', true, true),
  ('ventilation',    'Ventilation',         'ordinal', true, true),
  ('heat_exposure',  'Heat exposure',       'ordinal', true, true),
  ('privacy',        'Privacy',             'ordinal', true, true),
  ('storage',        'Storage',             'ordinal', true, true),
  ('laundry_ready',  'Laundry-ready',       'boolean', true, true),
  ('internet_ready', 'Internet-ready',      'boolean', true, true),
  ('elevator_distance','Elevator distance (m)','numeric', true, true),
  ('accessible',     'Step-free / accessible','boolean', true, true)
on conflict (code) do nothing;

-- --- DSS config v1 (active) --------------------------------------------
insert into public.recommendation_configs (version, base_weights, priority_multipliers, formula, is_active)
values (
  '1.0.0',
  '{"affordability":0.30,"space":0.20,"layout":0.15,"location":0.15,"environment":0.10,"features":0.10}'::jsonb,
  '{"HIGH":1.5,"MEDIUM":1.0,"LOW":0.5}'::jsonb,
  '{"type":"weighted_sum","precision":4,"rounding":"half_up","diversity":true}'::jsonb,
  true
)
on conflict (version) do nothing;

-- --- Legal rule set (DRAFT, UNVERIFIED => inactive; compliance fails closed) -
insert into public.legal_rule_sets (jurisdiction, authority_reference, version, verification_status, parameters, is_active)
values (
  'PH',
  'PLACEHOLDER — requires independent verification (see VERIFY.md)',
  '2024.0-draft',
  'UNVERIFIED',
  '{"max_advance_months":null,"max_deposit_months":null,"max_annual_escalation_pct":null}'::jsonb,
  false
)
on conflict (jurisdiction, version) do nothing;

-- --- System settings ---------------------------------------------------
insert into public.system_settings (key, value, environment)
values
  ('privacy.notice_version', '"1.0.0-draft"'::jsonb, 'ALL'),
  ('billing.cycle', '{"dayOfMonth":1,"dueDayOfMonth":10}'::jsonb, 'ALL'),
  ('reservation.hold_hours', '48'::jsonb, 'ALL'),
  ('recommendation.session_ttl_hours', '72'::jsonb, 'ALL')
on conflict (key) do nothing;
