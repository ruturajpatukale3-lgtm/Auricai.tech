-- ═══════════════════════════════════════════════════════════
-- Auricai — Complete Business Context Architecture (v2)
-- ═══════════════════════════════════════════════════════════
-- Consolidated migration: Table creation + Service Category field.
-- Run this ONCE in your Supabase SQL Editor to initialize.
-- ═══════════════════════════════════════════════════════════

-- 1. Create org_profile table
CREATE TABLE IF NOT EXISTS public.org_profile (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id            uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  industry          text NOT NULL,
  industry_raw      text,  -- explicitly for "Other" values
  service_category  text NOT NULL, -- The specific category (e.g. B2B SaaS)
  service_type      text NOT NULL, -- Detailed description
  target_customer   text NOT NULL, -- ICP description
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- 2. Performance Indices
CREATE INDEX IF NOT EXISTS idx_org_profile_org ON public.org_profile(org_id);

-- 3. Auto-update Trigger logic
CREATE OR REPLACE FUNCTION update_org_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_org_profile_updated_at ON public.org_profile;
CREATE TRIGGER trg_org_profile_updated_at
  BEFORE UPDATE ON public.org_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_org_profile_updated_at();

-- ═══════════════════════════════════════════════════════════
-- Migration complete. System is now AI-ready.
-- ═══════════════════════════════════════════════════════════
