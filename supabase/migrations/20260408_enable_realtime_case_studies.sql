-- ═══════════════════════════════════════════════════════════
-- CaseFlow Migration: Enable Realtime for Case Studies
-- Allows UI to subscribe to partial case study generation updates without polling
-- ═══════════════════════════════════════════════════════════

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'case_studies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.case_studies;
  END IF;
END $$;
