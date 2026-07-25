-- 0014_db14_announcements.sql
-- Announcements feature for property-wide notifications

-- 1. Announcements table
CREATE TABLE public.announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  body        text NOT NULL,
  audience    text NOT NULL DEFAULT 'ALL' CHECK (audience IN ('ALL', 'TENANTS', 'STAFF')),
  priority    text NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'URGENT')),
  published_at timestamptz,
  expires_at  timestamptz,
  created_by  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX announcements_audience_idx ON public.announcements (audience, published_at DESC);
CREATE INDEX announcements_published_idx ON public.announcements (published_at DESC) WHERE published_at IS NOT NULL;

-- 2. RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY ann_read ON public.announcements
  FOR SELECT USING (
    app.is_admin()
    OR (
      published_at IS NOT NULL
      AND (expires_at IS NULL OR expires_at > now())
      AND (
        audience = 'ALL'
        OR (audience = 'TENANTS' AND app.has_role('TENANT'))
        OR (audience = 'STAFF' AND (app.has_role('SUPER_ADMIN') OR app.has_role('PROPERTY_ADMIN') OR app.has_role('GUARD') OR app.has_role('MAINTENANCE')))
      )
    )
  );

CREATE POLICY ann_admin_insert ON public.announcements
  FOR INSERT WITH CHECK (app.is_admin());

CREATE POLICY ann_admin_update ON public.announcements
  FOR UPDATE USING (app.is_admin());

CREATE POLICY ann_admin_delete ON public.announcements
  FOR DELETE USING (app.is_admin());

-- 3. Trigger for updated_at
CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- 4. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT ON public.announcements TO anon;
