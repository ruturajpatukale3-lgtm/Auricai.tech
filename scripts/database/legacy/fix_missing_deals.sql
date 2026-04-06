-- ═══════════════════════════════════════════════════════════
-- CaseFlow — Missing Tables Fix (Deals & Attributions)
-- Run this in your Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════

-- 1. Create DEALS Table
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed_won', 'closed_lost')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create DEAL ATTRIBUTIONS Table
CREATE TABLE IF NOT EXISTS public.deal_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  case_study_id UUID NOT NULL REFERENCES public.case_studies(id) ON DELETE CASCADE,
  influence_weight NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Indices
CREATE INDEX IF NOT EXISTS idx_deals_org ON public.deals(org_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(org_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_deal_case ON public.deal_attributions (deal_id, case_study_id);
CREATE INDEX IF NOT EXISTS idx_attributions_org ON public.deal_attributions(org_id);
CREATE INDEX IF NOT EXISTS idx_attributions_case ON public.deal_attributions(case_study_id);

-- 4. Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_attributions ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
DROP POLICY IF EXISTS "org_isolation_select_deals" ON public.deals;
CREATE POLICY "org_isolation_select_deals" ON public.deals 
  FOR SELECT USING (org_id = (auth.jwt()->>'org_id')::uuid);

DROP POLICY IF EXISTS "org_isolation_select_attributions" ON public.deal_attributions;
CREATE POLICY "org_isolation_select_attributions" ON public.deal_attributions 
  FOR SELECT USING (org_id = (auth.jwt()->>'org_id')::uuid);

-- 6. Enable Realtime (This may error if table already exists in publication, but that's fine)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Table deals already in publication';
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_attributions;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Table deal_attributions already in publication';
  END;
END $$;
