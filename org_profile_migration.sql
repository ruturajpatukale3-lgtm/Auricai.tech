-- ═══════════════════════════════════════════════════════════
-- Auricai — org_profile table
-- Stores business context captured during onboarding Step 2.
-- One row per organization (1:1 via UNIQUE on org_id).
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS org_profile (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  industry        text NOT NULL,
  industry_raw    text,  -- only populated when industry = 'other'
  service_type    text NOT NULL,
  target_customer text NOT NULL,
  primary_goal    text NOT NULL CHECK (primary_goal IN ('leads', 'sales', 'revenue_growth', 'conversions')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Fast lookup by org
CREATE INDEX IF NOT EXISTS idx_org_profile_org_id ON org_profile(org_id);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_org_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_org_profile_updated_at
  BEFORE UPDATE ON org_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_org_profile_updated_at();
