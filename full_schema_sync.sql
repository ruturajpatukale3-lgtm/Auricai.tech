-- ═══════════════════════════════════════════════════════════
-- CaseFlow — FULL SCHEMA SYNC (RECOVERY SCRIPT)
-- ═══════════════════════════════════════════════════════════

-- 1. Create Tables (If they don't exist)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan_type IN ('starter', 'growth', 'enterprise')),
  subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'cancelled', 'trialing')),
  current_period_end TIMESTAMPTZ,
  domain TEXT,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#FFFFFF',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor'
    CHECK (role IN ('owner', 'admin', 'editor')),
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'inactive')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  client_name TEXT,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'in_progress', 'completed', 'approved', 'published')),
  token TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  extracted JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  interview_id UUID REFERENCES public.interviews(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  headline TEXT,
  metric_type TEXT,
  before_value TEXT,
  after_value TEXT,
  delta_percent NUMERIC,
  timeframe TEXT,
  pipeline_value NUMERIC DEFAULT 0,
  deals_influenced INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'live')),
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.usage (
  org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  interviews_used INTEGER DEFAULT 0,
  interviews_limit INTEGER DEFAULT 10,
  case_studies_used INTEGER DEFAULT 0,
  case_studies_limit INTEGER DEFAULT 3
);

CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed_won', 'closed_lost')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deal_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  case_study_id UUID NOT NULL REFERENCES public.case_studies(id) ON DELETE CASCADE,
  influence_weight NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  deal_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 2. Functions & Triggers
CREATE OR REPLACE FUNCTION enforce_answer_cap()
RETURNS trigger AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.interview_answers WHERE interview_id = NEW.interview_id) >= 20 THEN
    RAISE EXCEPTION 'MAX_ANSWERS_REACHED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_answer_cap ON public.interview_answers;
CREATE TRIGGER trg_answer_cap
BEFORE INSERT ON public.interview_answers
FOR EACH ROW EXECUTE FUNCTION enforce_answer_cap();

CREATE OR REPLACE FUNCTION create_interview_atomic(p_org uuid)
RETURNS void AS $$
DECLARE
  current_used int;
  current_limit int;
BEGIN
  SELECT interviews_used, interviews_limit
  INTO current_used, current_limit
  FROM public.usage
  WHERE org_id = p_org
  FOR UPDATE;

  IF NOT FOUND THEN
     -- Initialize usage if missing
     INSERT INTO public.usage (org_id, interviews_used, interviews_limit, case_studies_used, case_studies_limit)
     VALUES (p_org, 0, 10, 0, 3)
     RETURNING interviews_used, interviews_limit INTO current_used, current_limit;
  END IF;

  IF current_used >= current_limit THEN
    RAISE EXCEPTION 'LIMIT_REACHED';
  END IF;

  UPDATE public.usage
  SET interviews_used = interviews_used + 1
  WHERE org_id = p_org;
END;
$$ LANGUAGE plpgsql;

-- 3. RLS & Realtime
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_attributions ENABLE ROW LEVEL SECURITY;

-- 4. Re-Initialize Usage for existing organizations
INSERT INTO public.usage (org_id, interviews_used, interviews_limit, case_studies_used, case_studies_limit)
SELECT id, 0, 10, 0, 3 FROM public.organizations
ON CONFLICT (org_id) DO NOTHING;
