-- ═══════════════════════════════════════════════════════════
-- Auricai — SMS Consent Migration (TCPA/GDPR Compliance)
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.interviews
ADD COLUMN sms_consent boolean DEFAULT false,
ADD COLUMN sms_consent_at timestamp with time zone;

-- We maintain the previous records without consent to preserve history,
-- but the cron job will refuse to parse them for reminders natively 
-- because of the (sms_consent = true) query requirement.
