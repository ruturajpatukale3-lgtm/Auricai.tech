-- ═══════════════════════════════════════════════════════════
-- Auricai — Multi-Attempt Email Reminder System
-- Adds reminder_attempts and updates RPCs for 3-attempt follow-ups.
-- ═══════════════════════════════════════════════════════════

-- 1. Ensure columns exist on interviews table
ALTER TABLE interviews 
  ADD COLUMN IF NOT EXISTS reminder_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

-- Migrate reminder_sent (bool) to reminder_attempts (int) if needed
UPDATE interviews 
   SET reminder_attempts = 1, 
       last_reminder_at = reminder_sent_at
 WHERE reminder_sent = true 
   AND reminder_attempts = 0;

-- 2. Update the idempotent claim RPC
-- Now increments reminder_attempts and checks for < 3.
-- Enforces a 24h delay since the last reminder.
CREATE OR REPLACE FUNCTION claim_email_reminder(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
  v_attempts integer;
  v_last_reminder timestamptz;
  v_sent_at timestamptz;
BEGIN
  -- Row-level lock for atomic check+update
  SELECT status, reminder_attempts, last_reminder_at, sent_at
    INTO v_status, v_attempts, v_last_reminder, v_sent_at
    FROM interviews
   WHERE id = p_id
     FOR UPDATE;

  -- Guard: max 3 attempts reached
  IF v_attempts >= 3 THEN
    RETURN false;
  END IF;

  -- Guard: only remind if still in 'sent' or 'in_progress'
  IF v_status NOT IN ('sent', 'in_progress') THEN
    RETURN false;
  END IF;

  -- Guard: wait 24h since initial send (for 1st reminder) or last reminder (for 2nd/3rd)
  IF v_attempts = 0 THEN
    IF v_sent_at > now() - interval '24 hours' THEN
      RETURN false;
    END IF;
  ELSE
    IF v_last_reminder > now() - interval '24 hours' THEN
      RETURN false;
    END IF;
  END IF;

  -- Increment attempts and update timestamp
  UPDATE interviews
     SET reminder_attempts = v_attempts + 1,
         last_reminder_at = now(),
         reminder_sent = true, -- keep for backward compatibility with status queries
         reminder_sent_at = now()
   WHERE id = p_id;

  RETURN true;
END;
$$;

-- 3. Update the revert RPC
-- Decrements attempts if the email send fails.
CREATE OR REPLACE FUNCTION revert_email_reminder(p_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE interviews
     SET reminder_attempts = GREATEST(0, reminder_attempts - 1),
         last_reminder_at = NULL -- reset so it can retry in next cron
   WHERE id = p_id;
END;
$$;
