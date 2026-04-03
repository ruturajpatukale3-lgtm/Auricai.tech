-- ═══════════════════════════════════════════════════════════
-- Auricai — Soft Delete Support for Organizations
-- 
-- RULE: deleted_at IS NOT NULL = workspace is soft-deleted.
-- After 7 days, a background job permanently purges all data.
-- CASCADE on org FK handles child tables automatically.
-- ═══════════════════════════════════════════════════════════

-- 1. Add soft-delete column
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Index for efficient soft-delete queries (background purge job)
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at
  ON public.organizations (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 3. Audit log for workspace deletions (irrefutable paper trail)
CREATE TABLE IF NOT EXISTS public.workspace_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  org_name TEXT NOT NULL,
  deleted_by_user_id TEXT NOT NULL,
  plan_at_deletion TEXT,
  paddle_subscription_id TEXT,
  soft_deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hard_deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deletion_log_org
  ON public.workspace_deletion_log (org_id);
