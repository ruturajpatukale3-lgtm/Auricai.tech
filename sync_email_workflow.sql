-- ═══════════════════════════════════════════════════════════
-- Migration: Remove Twilio, add email-only reminder fields
-- Safe to run multiple times (idempotent via IF EXISTS / IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════

-- 1. Add new email-reminder columns (safe: IF NOT EXISTS)
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS reminder_stage INTEGER DEFAULT 0;

-- 2. Backfill sent_at from created_at for existing rows
UPDATE public.interviews SET sent_at = created_at WHERE sent_at IS NULL;

-- 3. Drop legacy Twilio/SMS columns (safe: IF EXISTS)
ALTER TABLE public.interviews DROP COLUMN IF EXISTS phone_number;
ALTER TABLE public.interviews DROP COLUMN IF EXISTS sms_consent;
ALTER TABLE public.interviews DROP COLUMN IF EXISTS sms_consent_at;
ALTER TABLE public.interviews DROP COLUMN IF EXISTS reminder_channel;
ALTER TABLE public.interviews DROP COLUMN IF EXISTS reminder_attempts;
ALTER TABLE public.interviews DROP COLUMN IF EXISTS opt_out;

-- 4. Index for the cron reminder query
CREATE INDEX IF NOT EXISTS idx_interviews_reminder_pending
  ON public.interviews (sent_at)
  WHERE status IN ('sent', 'in_progress') AND reminder_sent = false;

-- 5. Drop old Twilio RPC if it exists
DROP FUNCTION IF EXISTS lock_and_mark_reminder(uuid, text);

-- 6. Create new atomic email-reminder RPC
--    Returns TRUE if lock acquired, FALSE if already sent or wrong state.
CREATE OR REPLACE FUNCTION claim_email_reminder(p_id uuid)
RETURNS boolean AS $$
DECLARE
  v_reminder_sent boolean;
  v_status text;
BEGIN
  -- Row-level lock to prevent concurrent processing
  SELECT reminder_sent, status
    INTO v_reminder_sent, v_status
    FROM public.interviews
   WHERE id = p_id
     FOR UPDATE NOWAIT;

  -- Guard: already sent
  IF v_reminder_sent THEN
    RETURN false;
  END IF;

  -- Guard: wrong status (completed/approved/published)
  IF v_status NOT IN ('sent', 'in_progress') THEN
    RETURN false;
  END IF;

  -- Mark optimistically
  UPDATE public.interviews
     SET reminder_sent = true,
         reminder_sent_at = now()
   WHERE id = p_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 7. Revert helper — called if Resend email fails after lock
CREATE OR REPLACE FUNCTION revert_email_reminder(p_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.interviews
     SET reminder_sent = false,
         reminder_sent_at = null
   WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;
