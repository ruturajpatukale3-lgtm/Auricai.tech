-- ═══════════════════════════════════════════════════════════
-- Auricai — Add "generating" status to interviews
-- Required for the unified AI generation pipeline.
-- Status flow: completed → generating → review_ready
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.interviews
DROP CONSTRAINT IF EXISTS interviews_status_check;

ALTER TABLE public.interviews
ADD CONSTRAINT interviews_status_check
CHECK (status IN ('sent', 'opened', 'in_progress', 'completed', 'generating', 'review_ready', 'approved', 'published'));
