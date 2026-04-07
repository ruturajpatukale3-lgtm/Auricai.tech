-- ═══════════════════════════════════════════════════════════
-- CaseFlow Migration: Add Case Study Engagement Columns
-- Fixes missing 'clicks', 'views', and 'total_read_time'
-- ═══════════════════════════════════════════════════════════

-- 1. Add missing engagement columns safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_studies' AND column_name = 'views') THEN
        ALTER TABLE public.case_studies ADD COLUMN views INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_studies' AND column_name = 'clicks') THEN
        ALTER TABLE public.case_studies ADD COLUMN clicks INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_studies' AND column_name = 'total_read_time') THEN
        ALTER TABLE public.case_studies ADD COLUMN total_read_time NUMERIC DEFAULT 0;
    END IF;
END $$;

-- 2. Create/Update Engagement RPCs for atomic increments
CREATE OR REPLACE FUNCTION public.increment_views(case_study_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.case_studies
    SET views = COALESCE(views, 0) + 1
    WHERE id = case_study_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_clicks(case_study_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.case_studies
    SET clicks = COALESCE(clicks, 0) + 1
    WHERE id = case_study_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_read_time(case_study_id UUID, ping_value NUMERIC)
RETURNS VOID AS $$
BEGIN
    UPDATE public.case_studies
    SET total_read_time = COALESCE(total_read_time, 0) + ping_value
    WHERE id = case_study_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
