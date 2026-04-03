-- ═══════════════════════════════════════════════════════════
-- Auricai — Twilio Reminder Stages Migration
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Update lock RPC to support stage limits instead of boolean
CREATE OR REPLACE FUNCTION lock_and_mark_reminder(
  p_interview_id uuid,
  p_channel text
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
  v_reminder_attempts integer;
  v_opt_out boolean;
  v_phone text;
BEGIN
  -- Lock the row
  SELECT status, reminder_attempts, opt_out, phone_number
    INTO v_status, v_reminder_attempts, v_opt_out, v_phone
    FROM interviews
   WHERE id = p_interview_id
     FOR UPDATE;

  -- Guard: max stages sent (2 max)
  IF v_reminder_attempts >= 2 THEN
    RETURN 'ALREADY_SENT';
  END IF;

  -- Guard: completed/approved/published
  IF v_status NOT IN ('sent', 'in_progress') THEN
    RETURN 'INVALID_STATUS';
  END IF;

  -- Guard: opted out
  IF v_opt_out THEN
    RETURN 'OPT_OUT';
  END IF;

  -- Guard: no phone
  IF v_phone IS NULL OR v_phone = '' THEN
    RETURN 'NO_PHONE';
  END IF;

  -- Mark as sent/progress stage (atomically)
  UPDATE interviews
     SET reminder_sent = true,
         reminder_sent_at = now(),
         reminder_channel = p_channel,
         reminder_attempts = reminder_attempts + 1
   WHERE id = p_interview_id;

  RETURN 'OK';
END;
$$;
