-- ═══════════════════════════════════════════════════════════
-- Auricai — Refund Abuse Protection Migration
-- ═══════════════════════════════════════════════════════════

-- 1. Update subscriptions table schema
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS access_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Update payment_status check constraint
ALTER TABLE public.subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_payment_status_check;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_payment_status_check 
CHECK (payment_status IN ('active', 'past_due', 'cancelled', 'refunded'));

-- 3. Update increment_interview_usage RPC for refund blocking
CREATE OR REPLACE FUNCTION increment_interview_usage(p_org_id uuid)
RETURNS json AS $$
DECLARE
  v_used int;
  v_limit int;
  v_end timestamptz;
  v_plan text;
  v_next_plan text;
  v_payment_status text;
  v_access_blocked boolean;
BEGIN
  -- 1. Lock and fetch current state
  SELECT 
    interviews_used, interviews_limit, current_period_end, plan_name, next_plan, payment_status, access_blocked
  INTO 
    v_used, v_limit, v_end, v_plan, v_next_plan, v_payment_status, v_access_blocked
  FROM public.subscriptions
  WHERE org_id = p_org_id
  FOR UPDATE;

  -- 2. Hard Block: Refunded or Blocked
  IF v_payment_status = 'refunded' OR v_access_blocked = TRUE THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ACCESS_BLOCKED',
      'message', 'Your access has been blocked due to a recent refund or account restriction.'
    );
  END IF;

  -- 3. Hard Block: Payment Required
  IF v_payment_status = 'cancelled' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'PAYMENT_REQUIRED',
      'upgrade_required', true,
      'message', 'Subscription is cancelled. Please update payment method.'
    );
  END IF;

  -- 4. Lazy Reset & Plan Transition (Stay the same as previous migration)
  IF v_end < now() THEN
    IF v_next_plan IS NOT NULL THEN
      v_limit := CASE 
        WHEN v_next_plan = 'growth' THEN 60
        WHEN v_next_plan = 'enterprise' THEN 1000
        ELSE 25
      END;

      UPDATE public.subscriptions
      SET 
        plan_name = v_next_plan,
        next_plan = NULL,
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

  -- 5. Strict Limit Check
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

  -- 6. Final Increment (Preserve interviews_used as requested)
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
