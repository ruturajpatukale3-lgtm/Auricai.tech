-- ═══════════════════════════════════════════════════════════
-- Auricai — Subscription Lifecycle Hardening (Trial & Free Tier)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_interview_usage(p_org_id uuid)
RETURNS json AS $$
DECLARE
  v_used int;
  v_limit int;
  v_end timestamptz;
  v_trial_end timestamptz;
  v_plan text;
  v_payment_status text;
  v_access_blocked boolean;
  v_grace_days constant int := 3;
  v_grace_cap constant int := 5; -- Hard cap for usage during grace period
BEGIN
  -- 1. Lock and fetch current state
  SELECT 
    interviews_used, interviews_limit, current_period_end, trial_end, plan_name, payment_status, access_blocked
  INTO 
    v_used, v_limit, v_end, v_trial_end, v_plan, v_payment_status, v_access_blocked
  FROM public.subscriptions
  WHERE org_id = p_org_id
  FOR UPDATE;

  -- 2. Hard Block: Refunded or Admin Blocked
  IF v_payment_status = 'refunded' OR v_access_blocked = TRUE THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ACCESS_BLOCKED',
      'message', 'Your access has been restricted.'
    );
  END IF;

  -- 3. Resolve Effective Limits
  -- Logic: 
  --   a) If trial is active (not expired) -> use trial limit (25)
  --   b) If trial is expired AND no active subscription -> fallback to FREE (2)
  --   c) If subscription is inactive (cancelled + expired) -> fallback to FREE (2)
  --   d) If subscription is past_due -> enforce grace period and cap
  
  IF v_plan = 'trial' THEN
    IF now() > v_trial_end THEN
      v_limit := 2; -- Fallback to Free
    ELSE
      v_limit := 25; -- Standard Trial
    END IF;
  ELSIF v_payment_status = 'past_due' THEN
    -- Check grace period (3 days)
    IF now() > (v_end + (v_grace_days || ' days')::interval) THEN
      v_limit := 2; -- Fallback to Free after grace
    ELSE
      -- Within grace: allow usage ONLY up to (previous_used + grace_cap) or (v_limit)
      -- This prevents abuse of high-limit plans during grace
      v_limit := LEAST(v_limit, v_used + v_grace_cap);
    END IF;
  ELSIF v_payment_status = 'cancelled' AND now() > v_end THEN
    v_limit := 2; -- Fallback to Free after cancellation period
  ELSIF v_payment_status = 'inactive' THEN
    v_limit := 2; -- Manual/System inactive state
  END IF;

  -- 4. Period Reset (Lazy)
  -- Only for paid plans that are still active
  IF v_plan != 'trial' AND v_plan != 'free' AND v_end < now() AND v_payment_status = 'active' THEN
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

  -- 5. Strict Limit Check
  IF v_used >= v_limit THEN
    -- Specialized error for Trial -> Free transition
    IF v_plan = 'trial' AND now() > v_trial_end THEN
       RETURN json_build_object(
        'success', false,
        'error', 'TRIAL_EXPIRED',
        'message', 'Your trial has expired. You are now on the Free plan (2 interviews limit).',
        'upgrade_required', true
      );
    END IF;

    RETURN json_build_object(
      'success', false,
      'error', 'LIMIT_REACHED',
      'metric', 'interviews',
      'limit', v_limit,
      'used', v_used,
      'upgrade_required', true
    );
  END IF;

  -- 6. Final Increment
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
