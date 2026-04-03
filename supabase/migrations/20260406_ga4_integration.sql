-- ═══════════════════════════════════════════════════════════
-- Auricai — GA4 Support
-- Adds GA4 measurement ID to organizations
-- ═══════════════════════════════════════════════════════════

-- 1. GA4 Measurement ID (per-org analytics)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS ga4_measurement_id TEXT;
