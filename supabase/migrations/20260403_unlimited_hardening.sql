-- ═══════════════════════════════════════════════════════════
-- CaseFlow — Unlimited Limit Hardening
-- Ensures -1 is treated as "Unlimited" in the RPC function.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_interview_usage(p_org_id uuid)
RETURNS json AS $$
DECLARE
  v_used int;
  v_limit int;
  v_end timestamptz;
  v_plan text;
BEGIN
  -- 1. Lock and fetch current state
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

  -- 3. Strict Check (Bypass if limit is -1)
  IF v_limit <> -1 AND v_used >= v_limit THEN
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
