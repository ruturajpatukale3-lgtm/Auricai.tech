-- ═══════════════════════════════════════════════════════════
-- HubSpot Integration Schema Additions
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Create hubspot_connections table
CREATE TABLE IF NOT EXISTS public.hubspot_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.hubspot_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org's hubspot connection"
  ON public.hubspot_connections
  USING (
    organization_id IN (
      SELECT org_id FROM public.team_members WHERE user_id = auth.uid() OR email = auth.jwt()->>'email'
    )
  );

-- 2. Create external_deals table
CREATE TABLE IF NOT EXISTS public.external_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  stage TEXT NOT NULL,
  contact_email TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, external_id)
);

ALTER TABLE public.external_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their org's external deals"
  ON public.external_deals FOR SELECT
  USING (
    organization_id IN (
      SELECT org_id FROM public.team_members WHERE user_id = auth.uid() OR email = auth.jwt()->>'email'
    )
  );

-- 3. Modify deal_attributions to support external deals
ALTER TABLE public.deal_attributions 
  ADD COLUMN IF NOT EXISTS external_deal_id UUID REFERENCES public.external_deals(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'internal' CHECK (source IN ('internal', 'hubspot'));

-- We need to drop the NOT NULL constraint on deal_id if we want attributions to just point to an external deal
ALTER TABLE public.deal_attributions ALTER COLUMN deal_id DROP NOT NULL;

-- Ensure an attribution points to exactly one type of deal
ALTER TABLE public.deal_attributions
  ADD CONSTRAINT deal_attributions_target_check 
  CHECK (
    (source = 'internal' AND deal_id IS NOT NULL AND external_deal_id IS NULL) OR
    (source = 'hubspot' AND external_deal_id IS NOT NULL AND deal_id IS NULL)
  );

-- Update RLS for modified deal_attributions if needed (it already maps via org_id)

-- 4. Enable Supabase Realtime for external_deals so UI updates
-- The following command requires logical replication publication updates.
-- Depending on Supabase settings, you might need to enable it via dashboard.
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.external_deals;
