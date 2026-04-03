-- ═══════════════════════════════════════════════════════════
-- CaseFlow — Final Subscription Hardening
-- Idempotency → Deferred Downgrades → Trial Infrastructure
-- ═══════════════════════════════════════════════════════════

-- 1. Create webhook_events table for idempotency
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add next_plan and trial_end to subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS next_plan TEXT,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

-- 3. Update increment_interview_usage to handle trial and deferred plans
CREATE OR REPLACE FUNCTION increment_interview_usage(p_org_id uuid)
RETURNS json AS $$
DECLARE
  v_used int;
  v_limit int;
  v_end timestamptz;
  v_plan text;
  v_next_plan text;
  v_trial_end timestamptz;
BEGIN
  -- 1. Lock and fetch current state
  SELECT interviews_used, interviews_limit, current_period_end, plan_name, next_plan, trial_end
  INTO v_used, v_limit, v_end, v_plan, v_next_plan, v_trial_end
  FROM public.subscriptions
  WHERE org_id = p_org_id
  FOR UPDATE;

  -- 2. Trial Check
  -- Only block if trial expired AND they haven't upgraded beyond starter
  IF v_trial_end IS NOT NULL AND v_trial_end < now() AND v_plan = 'starter' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'TRIAL_EXPIRED',
      'upgrade_required', true
    );
  END IF;

  -- 3. Lazy Reset: If period expired, reset used counter and apply next_plan
  IF v_end < now() THEN
    -- If we have a pending downgrade/change, apply it now
    IF v_next_plan IS NOT NULL THEN
      v_plan := v_next_plan;
      
      -- Update limits based on new plan (hardcoded mapping for safety during reset)
      IF v_plan = 'starter' THEN v_limit := 25;
      ELSIF v_plan = 'growth' THEN v_limit := 60;
      ELSIF v_plan = 'enterprise' THEN v_limit := 1000;
      END IF;
    END IF;

    UPDATE public.subscriptions
    SET 
      interviews_used = 0,
      plan_name = v_plan,
      interviews_limit = v_limit,
      next_plan = NULL, -- Clear the pending plan
      current_period_start = v_end,
      current_period_end = v_end + interval '1 month',
      updated_at = now()
    WHERE org_id = p_org_id;
    
    v_used := 0;
    v_end := v_end + interval '1 month';
  END IF;

  -- 4. Strict Check
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

  -- 5. Increment
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

-- 4. Update initialization to include trial_end (7 days)
CREATE OR REPLACE FUNCTION initialize_org_subscription()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.subscriptions (
    org_id, 
    plan_name, 
    interviews_limit, 
    team_seat_limit,
    current_period_start,
    current_period_end,
    trial_end
  ) VALUES (
    NEW.id, 
    'starter', 
    25, 
    1,
    now(),
    now() + interval '1 month',
    now() + interval '7 days'
  ) ON CONFLICT (org_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
