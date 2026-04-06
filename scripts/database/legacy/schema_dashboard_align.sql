-- 1. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  paddle_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create branding table
CREATE TABLE IF NOT EXISTS public.branding (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563EB',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Modify usage table
ALTER TABLE public.usage ADD COLUMN IF NOT EXISTS ai_cost NUMERIC DEFAULT 0;
ALTER TABLE public.usage ADD COLUMN IF NOT EXISTS reset_date TIMESTAMPTZ;

-- 4. Set defaults for usage
ALTER TABLE public.usage ALTER COLUMN interviews_limit SET DEFAULT 2;

-- 5. Create default rows for orgs via trigger
CREATE OR REPLACE FUNCTION initialize_org_dashboard_data()
RETURNS trigger AS $$
BEGIN
  -- Insert default usage
  INSERT INTO public.usage (org_id, interviews_used, interviews_limit)
  VALUES (NEW.id, 0, 2)
  ON CONFLICT (org_id) DO NOTHING;

  -- Insert default subscription (free)
  INSERT INTO public.subscriptions (organization_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (organization_id) DO NOTHING;

  -- Insert default branding
  INSERT INTO public.branding (organization_id, primary_color)
  VALUES (NEW.id, '#2563EB')
  ON CONFLICT (organization_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_initialize_org_data ON public.organizations;
CREATE TRIGGER trg_initialize_org_data
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION initialize_org_dashboard_data();

-- Backfill existing organizations
DO $$ 
DECLARE
  org record;
BEGIN
  FOR org IN SELECT id FROM public.organizations LOOP
    INSERT INTO public.usage (org_id, interviews_used, interviews_limit) VALUES (org.id, 0, 2) ON CONFLICT DO NOTHING;
    INSERT INTO public.subscriptions (organization_id) VALUES (org.id) ON CONFLICT DO NOTHING;
    INSERT INTO public.branding (organization_id) VALUES (org.id) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Enable RLS and Realtime
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_select_subscriptions" ON public.subscriptions FOR SELECT USING (organization_id = (auth.jwt()->>'org_id')::uuid);
CREATE POLICY "org_isolation_select_branding" ON public.branding FOR SELECT USING (organization_id = (auth.jwt()->>'org_id')::uuid);

ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.branding;
