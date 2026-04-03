-- ═══════════════════════════════════════════════════════════
-- Auricai — Production Billing Hardening Migration
-- ═══════════════════════════════════════════════════════════

-- 1. Update increment_interview_usage with Grace Period (3 days)
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
  v_grace_days constant int := 3;
BEGIN
  -- 1. Lock and fetch current state
  SELECT 
    interviews_used, interviews_limit, current_period_end, plan_name, next_plan, payment_status, access_blocked
  INTO 
    v_used, v_limit, v_end, v_plan, v_next_plan, v_payment_status, v_access_blocked
  FROM public.subscriptions
  WHERE org_id = p_org_id
  FOR UPDATE;

  -- 2. Hard Block: Refunded or Admin Blocked
  IF v_payment_status = 'refunded' OR v_access_blocked = TRUE THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ACCESS_BLOCKED',
      'message', 'Your access has been blocked due to a recent refund or account restriction.'
    );
  END IF;

  -- 3. Payment Check with Grace Period
  IF v_payment_status = 'past_due' THEN
    -- Check if grace period is exceeded (3 days after period end)
    IF now() > (v_end + (v_grace_days || ' days')::interval) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'PAYMENT_REQUIRED',
        'upgrade_required', true,
        'message', 'Subscription is past due and grace period has ended. Please update payment method.'
      );
    END IF;
  ELSIF v_payment_status = 'cancelled' THEN
     RETURN json_build_object(
      'success', false,
      'error', 'PAYMENT_REQUIRED',
      'upgrade_required', true,
      'message', 'Subscription is cancelled. Please update payment method to resume usage.'
    );
  END IF;

  -- 4. Lazy Reset & Plan Transition (Stay the same)
  IF v_end < now() AND v_payment_status = 'active' THEN
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

-- 2. Add enforce_seat_limits RPC to handle excess members
CREATE OR REPLACE FUNCTION enforce_seat_limits(p_org_id uuid)
RETURNS void AS $$
DECLARE
  v_limit int;
  v_count int;
BEGIN
  -- Get current seat limit
  SELECT team_seat_limit INTO v_limit FROM public.subscriptions WHERE org_id = p_org_id;
  
  -- Count active members
  SELECT count(*) INTO v_count FROM public.team_members 
  WHERE org_id = p_org_id AND status = 'active';

  -- If limit exceeded, deactivate excess members
  -- Priority: 1. Role (owner, then admin, then member), 2. joined_at (earlier users stay active)
  IF v_count > v_limit THEN
    UPDATE public.team_members
    SET status = 'inactive'
    WHERE id IN (
      SELECT id FROM (
        SELECT id, 
               row_number() OVER (
                 ORDER BY 
                   CASE WHEN role = 'owner' THEN 0 WHEN role = 'admin' THEN 1 ELSE 2 END ASC,
                   joined_at ASC
               ) as r_num
        FROM public.team_members
        WHERE org_id = p_org_id AND status = 'active'
      ) t
      WHERE r_num > v_limit
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
