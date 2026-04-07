-- ═══════════════════════════════════════════════════════════
-- CaseFlow Migration: Fix Case Studies Schema
-- Adds missing fields and enforces REPLICA IDENTITY FULL
-- ═══════════════════════════════════════════════════════════

-- 1. Add missing columns safely (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_studies' AND column_name = 'summary') THEN
        ALTER TABLE public.case_studies ADD COLUMN summary TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_studies' AND column_name = 'metrics') THEN
        ALTER TABLE public.case_studies ADD COLUMN metrics JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_studies' AND column_name = 'updated_at') THEN
        ALTER TABLE public.case_studies ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- 2. Add trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_case_studies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_studies_updated_at ON public.case_studies;
CREATE TRIGGER trg_case_studies_updated_at
BEFORE UPDATE ON public.case_studies
FOR EACH ROW
EXECUTE FUNCTION update_case_studies_updated_at();

-- 3. Fix Replica Identity so Realtime broadcasts the FULL old row
ALTER TABLE public.case_studies REPLICA IDENTITY FULL;
