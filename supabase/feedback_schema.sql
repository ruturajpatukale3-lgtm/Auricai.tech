-- ═══════════════════════════════════════════════════════════
-- Auricai — Feedback Table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Select policy: Only service role or org owners can see this (though we only create from API)
CREATE POLICY "org_isolation_select_feedback" ON public.feedback FOR SELECT USING (org_id = (auth.jwt()->>'org_id')::uuid);

-- Insert policy: Handled by Service Role in the API
