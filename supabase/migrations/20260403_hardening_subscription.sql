-- ═══════════════════════════════════════════════════════════
-- CaseFlow — Subscription & Entitlement Hardening
-- Implements atomic counters, lazy resets, and strict limits.
-- ═══════════════════════════════════════════════════════════

-- 1. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan_name IN ('starter', 'growth', 'enterprise')),
  interviews_limit INTEGER NOT NULL DEFAULT 25,
  interviews_used INTEGER NOT NULL DEFAULT 0,
  team_seat_limit INTEGER NOT NULL DEFAULT 1,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 month'),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Migrate existing data from organizations and usage
DO $$
BEGIN
    INSERT INTO public.subscriptions (
        org_id, 
        plan_name, 
        interviews_limit, 
        interviews_used, 
        team_seat_limit, 
        current_period_start, 
        current_period_end
    )
    SELECT 
        o.id,
        COALESCE(o.plan_type, 'starter'),
        COALESCE(u.interviews_limit, 25),
        COALESCE(u.interviews_used, 0),
        CASE 
            WHEN o.plan_type = 'growth' THEN 2 
            WHEN o.plan_type = 'enterprise' THEN 5 
            ELSE 1 
        END,
        COALESCE(o.created_at, now()),
        COALESCE(o.current_period_end, now() + interval '1 month')
    FROM public.organizations o
    LEFT JOIN public.usage u ON o.id = u.org_id
    ON CONFLICT (org_id) DO NOTHING;
END $$;

-- 3. Atomic Usage Enforcement RPC (Race-Condition Safe)
CREATE OR REPLACE FUNCTION increment_interview_usage(p_org_id uuid)
RETURNS json AS $$
DECLARE
  v_used int;
  v_limit int;
  v_end timestamptz;
  v_plan text;
BEGIN
  -- 1. Lock and fetch current state (FOR UPDATE prevents concurrent increments)
  SELECT interviews_used, interviews_limit, current_period_end, plan_name
  INTO v_used, v_limit, v_end, v_plan
  FROM public.subscriptions
  WHERE org_id = p_org_id
  FOR UPDATE;

  -- 2. Lazy Reset: If period expired, reset used counter and advance dates
  IF v_end < now() THEN
    UPDATE public.subscriptions
    SET 
      interviews_used = 0,
      current_period_start = v_end,
      current_period_end = v_end + interval '1 month',
      updated_at = now()
    WHERE org_id = p_org_id;
    
    v_used := 0;
    v_end := v_end + interval '1 month';
  END IF;

  -- 3. Strict Check
  IF v_used >= v_limit THEN
    RETURN json_build_object(
      'success', false,
      'error', 'LIMIT_REACHED',
      'metric', 'interviews',
      'limit', v_limit,
      'used', v_used,
      'upgrade_required', true
    );
  END IF;

  -- 4. Increment
  UPDATE public.subscriptions
  SET 
    interviews_used = interviews_used + 1,
    updated_at = now()
  WHERE org_id = p_org_id;

  RETURN json_build_object(
    'success', true,
    'used', v_used + 1,
    'limit', v_limit
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Automatically initialize subscription for new organizations
CREATE OR REPLACE FUNCTION initialize_org_subscription()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.subscriptions (
    org_id, 
    plan_name, 
    interviews_limit, 
    team_seat_limit,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.id, 
    'starter', 
    25, 
    1,
    now(),
    now() + interval '1 month'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_init_subscription
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION initialize_org_subscription();

-- 5. RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation_select_subscriptions" ON public.subscriptions 
FOR SELECT USING (org_id = (auth.jwt()->>'org_id')::uuid);

-- 6. Cleanup (Optional but recommended for production)
-- DROP TABLE IF EXISTS public.usage;
