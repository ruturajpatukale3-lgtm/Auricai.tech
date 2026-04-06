-- PRODUCTION HARDENING: HubSpot Integration
-- Run this in the Supabase SQL Editor

-- 1. Add portal_id to hubspot_connections
ALTER TABLE public.hubspot_connections 
ADD COLUMN IF NOT EXISTS portal_id TEXT;

-- 2. Create hubspot_pushes table for history tracking
CREATE TABLE IF NOT EXISTS public.hubspot_pushes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_study_id UUID NOT NULL REFERENCES public.case_studies(id) ON DELETE CASCADE,
  prospect_email TEXT NOT NULL,
  hubspot_note_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, case_study_id, prospect_email)
);

-- Row Level Security for hubspot_pushes
ALTER TABLE public.hubspot_pushes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's push history"
  ON public.hubspot_pushes FOR SELECT
  USING (
    organization_id IN (
      SELECT org_id FROM public.team_members WHERE user_id = auth.uid() OR email = auth.jwt()->>'email'
    )
  );

-- 3. Indices for performance
CREATE INDEX IF NOT EXISTS idx_hubspot_pushes_lookup 
ON public.hubspot_pushes(organization_id, case_study_id, prospect_email);
