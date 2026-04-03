-- ═══════════════════════════════════════════════════════════
-- Auricai — Notifications Table + Free Plan Migration
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(org_id) WHERE read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_select_notifications" ON public.notifications
  FOR SELECT USING (org_id = (auth.jwt()->>'org_id')::uuid);

-- Service role bypass (admin access from server)
-- No additional policy needed — service_role key bypasses RLS

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2. FREE PLAN SUPPORT
-- Update the plan_type CHECK constraint to include 'free'
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_plan_type_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_plan_type_check
  CHECK (plan_type IN ('free', 'starter', 'growth', 'enterprise'));
