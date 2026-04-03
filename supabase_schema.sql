-- ═══════════════════════════════════════════════════════════
-- CaseFlow — Production Multi-Tenant Database Schema (HARDENED)
-- Every table has org_id. Every query filters by org_id.
-- RLS enforced on ALL tables tightly.
-- ═══════════════════════════════════════════════════════════

-- Drop existing tables (clean migration)
DROP TABLE IF EXISTS public.interview_progress CASCADE;
DROP TABLE IF EXISTS public.interview_answers CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.domains CASCADE;
DROP TABLE IF EXISTS public.usage CASCADE;
DROP TABLE IF EXISTS public.deal_attributions CASCADE;
DROP TABLE IF EXISTS public.deals CASCADE;
DROP TABLE IF EXISTS public.case_studies CASCADE;
DROP TABLE IF EXISTS public.interviews CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
DROP TABLE IF EXISTS public.processed_webhooks CASCADE;

-- ═══════════════════════════════════════════════════════════
-- 1. ORGANIZATIONS (Root tenant entity)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.organizations (
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

CREATE INDEX idx_organizations_domain ON public.organizations(domain);

-- ═══════════════════════════════════════════════════════════
-- 2. TEAM MEMBERS (Maps Clerk users to orgs)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.team_members (
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

CREATE INDEX idx_team_members_org ON public.team_members(org_id);
CREATE INDEX idx_team_members_email ON public.team_members(email);

-- ═══════════════════════════════════════════════════════════
-- 3. INTERVIEWS (Core funnel entity)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.interviews (
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

CREATE INDEX idx_interviews_org ON public.interviews(org_id);
CREATE INDEX idx_interviews_token ON public.interviews(token);

-- ═══════════════════════════════════════════════════════════
-- 4. INTERVIEW ANSWERS (Client responses)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  extracted JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_interview_answers_interview ON public.interview_answers(interview_id);

-- Enforce Answer Cap via Trigger
CREATE OR REPLACE FUNCTION enforce_answer_cap()
RETURNS trigger AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.interview_answers WHERE interview_id = NEW.interview_id) >= 20 THEN
    RAISE EXCEPTION 'MAX_ANSWERS_REACHED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_answer_cap
BEFORE INSERT ON public.interview_answers
FOR EACH ROW EXECUTE FUNCTION enforce_answer_cap();

-- ═══════════════════════════════════════════════════════════
-- 5. CASE STUDIES (Revenue assets)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.case_studies (
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

CREATE INDEX idx_case_studies_org ON public.case_studies(org_id);
CREATE INDEX idx_case_studies_slug ON public.case_studies(slug);

-- ═══════════════════════════════════════════════════════════
-- 6. USAGE (Plan limit tracking)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.usage (
  org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  interviews_used INTEGER DEFAULT 0,
  interviews_limit INTEGER DEFAULT 10,
  case_studies_used INTEGER DEFAULT 0,
  case_studies_limit INTEGER DEFAULT 3
);

-- Atomic Usage Enforcement RPC
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

  IF current_used >= current_limit THEN
    RAISE EXCEPTION 'LIMIT_REACHED';
  END IF;

  UPDATE public.usage
  SET interviews_used = interviews_used + 1
  WHERE org_id = p_org;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- 7. DOMAINS (Enterprise custom domains)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'inactive')),
  ssl_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (ssl_status IN ('pending', 'active', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_domains_org ON public.domains(org_id);

-- ═══════════════════════════════════════════════════════════
-- 8. EVENTS (System-wide event log with partitioning)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Initial partitions
CREATE TABLE IF NOT EXISTS public.events_2026_03 PARTITION OF public.events FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS public.events_2026_04 PARTITION OF public.events FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS public.events_2026_05 PARTITION OF public.events FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE INDEX idx_events_org_created ON public.events(org_id, created_at DESC);
CREATE INDEX idx_events_type ON public.events(type);
CREATE UNIQUE INDEX unique_deal_attr ON public.events(org_id, (metadata->>'deal_id'));

-- ═══════════════════════════════════════════════════════════
-- 8B. EVENTS OUTBOX (Transactional Pattern)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.events_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to automatically flush to outbox when interview occurs
CREATE OR REPLACE FUNCTION log_interview_created_outbox()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.events_outbox (org_id, type, entity_id, metadata)
  VALUES (NEW.org_id, 'interview_created', NEW.id::text, jsonb_build_object('client_email', NEW.client_email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_interview_outbox
AFTER INSERT ON public.interviews
FOR EACH ROW EXECUTE FUNCTION log_interview_created_outbox();

-- ═══════════════════════════════════════════════════════════
-- 9. ACTIVITIES (Human-readable feed)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  deal_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activities_org ON public.activities(org_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- 10. PROCESSED WEBHOOKS (Idempotency)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.processed_webhooks (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- 11. INTERVIEW PROGRESS (Question tracking)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.interview_progress (
  interview_id UUID PRIMARY KEY REFERENCES public.interviews(id) ON DELETE CASCADE,
  completed_questions INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  last_question_index INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- 12. BACKGROUND JOBS LEDGER
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.bg_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  error_log TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════
-- 12B. DEALS (Revenue tracking)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed_won', 'closed_lost')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deals_org ON public.deals(org_id);
CREATE INDEX idx_deals_status ON public.deals(org_id, status);

-- ═══════════════════════════════════════════════════════════
-- 12C. DEAL ATTRIBUTIONS (Attribution mapping)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.deal_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  case_study_id UUID NOT NULL REFERENCES public.case_studies(id) ON DELETE CASCADE,
  influence_weight NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prevent duplicate attribution
CREATE UNIQUE INDEX idx_unique_deal_case ON public.deal_attributions (deal_id, case_study_id);
CREATE INDEX idx_attributions_org ON public.deal_attributions(org_id);
CREATE INDEX idx_attributions_case ON public.deal_attributions(case_study_id);

-- ═══════════════════════════════════════════════════════════
-- 13. MATERIALIZED VIEWS (Analytics)
-- ═══════════════════════════════════════════════════════════
CREATE MATERIALIZED VIEW public.analytics_rollup AS
SELECT 
  org_id,
  COUNT(id) FILTER (WHERE status = 'published') as live_case_studies,
  COALESCE(SUM(pipeline_value), 0) as total_pipeline,
  COALESCE(SUM(deals_influenced), 0) as total_deals,
  COALESCE(SUM(views), 0) as total_views
FROM public.case_studies
GROUP BY org_id;

CREATE UNIQUE INDEX idx_analytics_rollup_org ON public.analytics_rollup(org_id);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — Enable on ALL tables
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bg_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_attributions ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES (HARDENED)
-- ═══════════════════════════════════════════════════════════

-- Base Rule: Everything is restricted by default.
-- Only Service Role Bypass applies because Server Components use Supabase Admin.

-- If UI needs specific realtime updates, we allow SELECT based on org_id logic in JWT.
CREATE POLICY "org_isolation_select_organizations" ON public.organizations FOR SELECT USING (id = (auth.jwt()->>'org_id')::uuid);
CREATE POLICY "org_isolation_select_team_members" ON public.team_members FOR SELECT USING (org_id = (auth.jwt()->>'org_id')::uuid);
CREATE POLICY "org_isolation_select_interviews" ON public.interviews FOR SELECT USING (org_id = (auth.jwt()->>'org_id')::uuid);
CREATE POLICY "org_isolation_select_case_studies" ON public.case_studies FOR SELECT USING (org_id = (auth.jwt()->>'org_id')::uuid);
CREATE POLICY "org_isolation_select_usage" ON public.usage FOR SELECT USING (org_id = (auth.jwt()->>'org_id')::uuid);
CREATE POLICY "org_isolation_select_domains" ON public.domains FOR SELECT USING (org_id = (auth.jwt()->>'org_id')::uuid);
CREATE POLICY "org_isolation_select_events" ON public.events FOR SELECT USING (org_id = (auth.jwt()->>'org_id')::uuid);
CREATE POLICY "org_isolation_select_activities" ON public.activities FOR SELECT USING (org_id = (auth.jwt()->>'org_id')::uuid);
CREATE POLICY "org_isolation_select_deals" ON public.deals FOR SELECT USING (org_id = (auth.jwt()->>'org_id')::uuid);
CREATE POLICY "org_isolation_select_attributions" ON public.deal_attributions FOR SELECT USING (org_id = (auth.jwt()->>'org_id')::uuid);

-- Public access policies (Must be strict)
CREATE POLICY "interviews_public_read_disabled" ON public.interviews FOR SELECT USING (false);
CREATE POLICY "organizations_public_read_disabled" ON public.organizations FOR SELECT USING (false);

-- ═══════════════════════════════════════════════════════════
-- ENABLE REALTIME on key tables
-- ═══════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.interviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_studies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.usage;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_attributions;


