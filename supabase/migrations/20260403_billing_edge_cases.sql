-- ═══════════════════════════════════════════════════════════
-- Auricai — Billing Edge-Case Migration
-- ═══════════════════════════════════════════════════════════

-- 1. Update subscriptions table schema
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS next_plan TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'active' 
  CHECK (payment_status IN ('active', 'past_due', 'cancelled')),
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ DEFAULT NULL;

-- 2. Enhanced Atomic Usage Enforcement RPC
CREATE OR REPLACE FUNCTION increment_interview_usage(p_org_id uuid)
RETURNS json AS $$
DECLARE
  v_used int;
  v_limit int;
  v_end timestamptz;
  v_plan text;
  v_next_plan text;
  v_payment_status text;
  v_limits jsonb;
BEGIN
  -- 1. Lock and fetch current state
  SELECT 
    interviews_used, interviews_limit, current_period_end, plan_name, next_plan, payment_status
  INTO 
    v_used, v_limit, v_end, v_plan, v_next_plan, v_payment_status
  FROM public.subscriptions
  WHERE org_id = p_org_id
  FOR UPDATE;

  -- 2. Hard Block: Payment Required
  IF v_payment_status = 'cancelled' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'PAYMENT_REQUIRED',
      'upgrade_required', true,
      'message', 'Subscription is cancelled. Please update payment method.'
    );
  END IF;

  -- 3. Lazy Reset & Plan Transition
  IF v_end < now() THEN
    -- If we have a next_plan scheduled, transition now
    IF v_next_plan IS NOT NULL THEN
      -- Resolve new limits (Starter defaults as fallback)
      v_limit := CASE 
        WHEN v_next_plan = 'growth' THEN 60
        WHEN v_next_plan = 'enterprise' THEN 1000
        ELSE 25
      END;

      UPDATE public.subscriptions
      SET 
        plan_name = v_next_plan,
        next_plan = NULL, -- Clear transition
        interviews_limit = v_limit,
        interviews_used = 0,
        current_period_start = v_end,
        current_period_end = v_end + interval '1 month',
        updated_at = now()
      WHERE org_id = p_org_id;
      
      v_plan := v_next_plan;
      v_used := 0;
      v_end := v_end + interval '1 month';
    ELSE
      -- Standard cycle reset
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
  END IF;

  -- 4. Strict Limit Check
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

  -- 5. Final Increment
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

-- 3. Update initialization trigger to include trial_end
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
