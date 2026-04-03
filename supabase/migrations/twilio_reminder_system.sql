-- ═══════════════════════════════════════════════════════════
-- Auricai — Twilio Reminder System Migration
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Extend interviews table with reminder fields
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_channel text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS reminder_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opt_out boolean NOT NULL DEFAULT false;

-- Index for the cron query (pending reminders)
CREATE INDEX IF NOT EXISTS idx_interviews_pending_reminders
  ON interviews (org_id, status, reminder_sent, opt_out, created_at)
  WHERE reminder_sent = false
    AND opt_out = false
    AND phone_number IS NOT NULL;

-- 2. Message logs — audit trail for every send attempt
CREATE TABLE IF NOT EXISTS message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  provider text NOT NULL CHECK (provider IN ('resend', 'twilio')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  error_code text,
  error_message text,
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_logs_interview
  ON message_logs (interview_id, channel);

CREATE INDEX IF NOT EXISTS idx_message_logs_org
  ON message_logs (org_id, created_at DESC);

-- 3. Twilio integration config per org
CREATE TABLE IF NOT EXISTS integrations_twilio (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  account_sid text NOT NULL,
  auth_token text NOT NULL,
  whatsapp_from text,       -- e.g. "whatsapp:+14155238886"
  sms_from text,            -- e.g. "+1234567890"
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Idempotent lock RPC — atomic "check + mark" to prevent duplicate sends
CREATE OR REPLACE FUNCTION lock_and_mark_reminder(
  p_interview_id uuid,
  p_channel text
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
  v_reminder_sent boolean;
  v_opt_out boolean;
  v_phone text;
BEGIN
  -- Lock the row
  SELECT status, reminder_sent, opt_out, phone_number
    INTO v_status, v_reminder_sent, v_opt_out, v_phone
    FROM interviews
   WHERE id = p_interview_id
     FOR UPDATE;

  -- Guard: already sent
  IF v_reminder_sent THEN
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

  -- Mark as sent (atomically)
  UPDATE interviews
     SET reminder_sent = true,
         reminder_sent_at = now(),
         reminder_channel = p_channel,
         reminder_attempts = reminder_attempts + 1
   WHERE id = p_interview_id;

  RETURN 'OK';
END;
$$;
