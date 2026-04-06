-- ═══════════════════════════════════════════════════════════
-- CaseFlow — Analytics Persistence Migration
-- Adds 'clicks' and 'total_read_time' to Case Studies.
-- ═══════════════════════════════════════════════════════════

-- 1. Add columns to case_studies
ALTER TABLE public.case_studies
ADD COLUMN IF NOT EXISTS clicks INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_read_time FLOAT NOT NULL DEFAULT 0.0;

-- 2. Function to increment clicks atomically
-- Using RPC for write safety under race conditions
CREATE OR REPLACE FUNCTION public.increment_clicks(case_study_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.case_studies
  SET clicks = clicks + 1
  WHERE id = case_study_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to increment read time atomically
-- ping_value should be the duration from the beacon (e.g. 15.0 seconds)
CREATE OR REPLACE FUNCTION public.increment_read_time(case_study_id UUID, ping_value FLOAT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.case_studies
  SET total_read_time = total_read_time + ping_value
  WHERE id = case_study_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
