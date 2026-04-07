-- ═══════════════════════════════════════════════════════════
-- Auricai — Add 'opened' status and 'opened_at' timestamp
-- ═══════════════════════════════════════════════════════════

-- 1. Add opened_at column
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Update status constraint
-- We need to drop the old constraint and add a new one that includes 'opened'
DO $$ 
BEGIN
    -- Try to find the name of the existing constraint on 'status'
    -- If it's the standard one created by the 'CHECK' syntax, it might be something like 'interviews_status_check'
    ALTER TABLE public.interviews DROP CONSTRAINT IF EXISTS interviews_status_check;
    
    -- Add the new constraint
    ALTER TABLE public.interviews 
    ADD CONSTRAINT interviews_status_check 
    CHECK (status IN ('sent', 'opened', 'in_progress', 'completed', 'review_ready', 'approved', 'published'));
END $$;

-- 3. Add index for performance on status queries
CREATE INDEX IF NOT EXISTS idx_interviews_status ON public.interviews(status);

-- 4. Enable realtime for interviews table if not already enabled
-- Note: This is usually done in the Supabase UI or via another migration, but good to include.
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.interviews;
