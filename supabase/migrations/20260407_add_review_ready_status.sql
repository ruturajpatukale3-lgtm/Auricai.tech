-- Migration: Add 'review_ready' to interview status
-- Goal: Allow a staging state between 'completed' (interview over) and 'approved' (client reviewed).

-- 1. Drop existing constraint
ALTER TABLE public.interviews 
DROP CONSTRAINT IF EXISTS interviews_status_check;

-- 2. Add new constraint with 'review_ready'
ALTER TABLE public.interviews
ADD CONSTRAINT interviews_status_check 
CHECK (status IN ('sent', 'in_progress', 'completed', 'review_ready', 'approved', 'published'));

-- 3. Log migration event
INSERT INTO public.events (org_id, type, metadata)
SELECT id, 'sync_correction', '{"migration": "added_review_ready_status"}'::jsonb
FROM public.organizations
LIMIT 1;
