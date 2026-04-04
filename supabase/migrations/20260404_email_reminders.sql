-- ═══════════════════════════════════════════════════════════
-- Auricai — Email Reminder System Migration
-- Adds columns and idempotent RPCs for automated follow-ups.
-- ═══════════════════════════════════════════════════════════

-- 1. Ensure columns exist on interviews table
ALTER TABLE interviews 
  ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz DEFAULT now();

-- Set sent_at for existing interviews if null
UPDATE interviews SET sent_at = created_at WHERE sent_at IS NULL;

-- 2. Create the idempotent claim RPC
-- Atomically checks status and reminder_sent before marking as sent.
-- Returns true if claimed, false if already sent or in wrong status.
CREATE OR REPLACE FUNCTION claim_email_reminder(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
  v_reminder_sent boolean;
BEGIN
  -- Row-level lock for atomic check+update
  SELECT status, reminder_sent 
    INTO v_status, v_reminder_sent
    FROM interviews
   WHERE id = p_id
     FOR UPDATE;

  -- Guard: already sent
  IF v_reminder_sent THEN
    RETURN false;
  END IF;

  -- Guard: only remind if still in 'sent' or 'in_progress'
  IF v_status NOT IN ('sent', 'in_progress') THEN
    RETURN false;
  END IF;

  -- Mark as sent
  UPDATE interviews
     SET reminder_sent = true,
         reminder_sent_at = now()
   WHERE id = p_id;

  RETURN true;
END;
$$;

-- 3. Create the revert RPC
-- Used if the email provider fails to send the email.
CREATE OR REPLACE FUNCTION revert_email_reminder(p_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE interviews
     SET reminder_sent = false,
         reminder_sent_at = null
   WHERE id = p_id;
END;
$$;
