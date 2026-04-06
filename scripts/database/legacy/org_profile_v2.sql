-- ═══════════════════════════════════════════════════════════
-- Auricai — Upgrades org_profile table to add service_category
-- ═══════════════════════════════════════════════════════════

ALTER TABLE org_profile ADD COLUMN IF NOT EXISTS service_category text;

-- (Optional) Default existing rows
UPDATE org_profile SET service_category = 'Unknown' WHERE service_category IS NULL;

-- Make it NOT NULL for future rows
ALTER TABLE org_profile ALTER COLUMN service_category SET NOT NULL;
