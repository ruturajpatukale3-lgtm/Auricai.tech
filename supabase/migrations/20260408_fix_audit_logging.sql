-- ═══════════════════════════════════════════════════════════
-- FIX: Usage Audit Logging & Billing Cycle Consolidation
-- PURPOSE: 
-- 1. Ensure 'billing_cycle' exists for yearly plan support.
-- 2. Fix missing audit logs by dropping overloaded signatures.
-- 3. Enforce strict search_path and transactional integrity.
-- ═══════════════════════════════════════════════════════════

-- 1. SCHEMA ALIGNMENT: Add billing_cycle if missing
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')) DEFAULT 'monthly';

-- 2. Drop old overloaded signatures to prevent signature mismatch
-- signature: (uuid, text, text, text, text)
DROP FUNCTION IF EXISTS public.create_interview_safe(uuid, text, text, text, text);
-- signature: (uuid, text, text, text, text, text)
DROP FUNCTION IF EXISTS public.create_interview_safe(uuid, text, text, text, text, text);

-- 3. Define the canonical create_interview_safe function
CREATE OR REPLACE FUNCTION public.create_interview_safe(
  p_org_id uuid,
  p_client_email text,
  p_client_name text,
  p_token text,
  p_idempotency_key text,
  p_user_id text DEFAULT NULL
) RETURNS json 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sub RECORD;
  v_interview RECORD;
  v_identity_total INT := 0;
  v_free_limit CONSTANT INT := 2;
  v_trial_limit CONSTANT INT := 25;
  v_effective_limit INT;
  v_effective_used INT;
  v_is_lifetime BOOLEAN := false;
  v_interval INTERVAL;
BEGIN
  -- 1. Idempotency Check (Fast-path return)
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_interview 
    FROM public.interviews 
    WHERE org_id = p_org_id AND idempotency_key = p_idempotency_key 
    LIMIT 1;
    
    IF v_interview.id IS NOT NULL THEN
      RETURN json_build_object('success', true, 'data', row_to_json(v_interview), 'is_idempotent_hit', true);
    END IF;
  END IF;

  -- 2. Lock and fetch current state (Critical for atomicity)
  SELECT 
    plan_name as plan_name, 
    interviews_used as interviews_used, 
    lifetime_interviews_used as lifetime_interviews_used, 
    interviews_limit as interviews_limit, 
    trial_end as trial_end, 
    current_period_end as current_period_end, 
    billing_cycle as billing_cycle,
    payment_status as payment_status, 
    access_blocked as access_blocked
  INTO v_sub
  FROM public.subscriptions
  WHERE org_id = p_org_id
  FOR UPDATE;

  IF v_sub.plan_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'SUBSCRIPTION_NOT_FOUND');
  END IF;

  -- 3. Hard Block Check
  IF v_sub.payment_status = 'refunded' OR v_sub.access_blocked = TRUE THEN
    RETURN json_build_object('success', false, 'error', 'ACCESS_BLOCKED', 'message', 'Your access has been restricted.');
  END IF;

  -- 4. Trial Expiry Auto-Transition
  IF v_sub.plan_name = 'trial' AND (v_sub.trial_end IS NOT NULL AND now() > v_sub.trial_end) THEN
    UPDATE public.subscriptions 
    SET plan_name = 'free', updated_at = now()
    WHERE org_id = p_org_id;
    v_sub.plan_name := 'free';
  END IF;

  -- 5. Route Logic: FREE vs OTHERS
  IF v_sub.plan_name = 'free' THEN
    -- Cross-org identity check if user_id provided
    IF p_user_id IS NOT NULL THEN
      SELECT COALESCE(total_used, 0) INTO v_identity_total
      FROM public.free_plan_identity_limits WHERE user_id = p_user_id;

      IF v_identity_total >= v_free_limit THEN
        RETURN json_build_object('success', false, 'error', 'FREE_LIMIT_REACHED', 
          'message', 'You have used all free interviews across your accounts. Upgrade to continue.',
          'limit', v_free_limit, 'used', v_identity_total, 'is_lifetime', true, 'upgrade_required', true);
      END IF;
    END IF;

    -- Org-level lifetime check
    IF v_sub.lifetime_interviews_used >= v_free_limit THEN
      RETURN json_build_object('success', false, 'error', 'FREE_LIMIT_REACHED',
        'message', 'Free plan limit reached (2 lifetime interviews). Upgrade to send more.',
        'limit', v_free_limit, 'used', v_sub.lifetime_interviews_used, 'is_lifetime', true, 'upgrade_required', true);
    END IF;

    v_effective_limit := v_free_limit;
    v_effective_used := v_sub.lifetime_interviews_used;
    v_is_lifetime := true;
  ELSE
    -- Corrected period reset (handles monthly vs yearly)
    IF v_sub.plan_name NOT IN ('trial', 'free') AND (v_sub.current_period_end IS NOT NULL AND now() > v_sub.current_period_end) THEN
      v_interval := CASE WHEN v_sub.billing_cycle = 'yearly' THEN interval '1 year' ELSE interval '1 month' END;
      
      UPDATE public.subscriptions 
      SET interviews_used = 0, 
          current_period_start = current_period_end, 
          current_period_end = current_period_end + v_interval, 
          updated_at = now()
      WHERE org_id = p_org_id;
      
      v_sub.interviews_used := 0;
    END IF;

    -- Apply limits
    v_effective_limit := CASE WHEN v_sub.plan_name = 'trial' THEN v_trial_limit ELSE v_sub.interviews_limit END;
    v_effective_used := v_sub.interviews_used;

    IF v_effective_used >= v_effective_limit THEN
      RETURN json_build_object('success', false, 'error', 'LIMIT_REACHED', 
        'metric', 'interviews', 'limit', v_effective_limit, 'used', v_effective_used, 'upgrade_required', true);
    END IF;
  END IF;

  -- 6. Atomic Insertion
  INSERT INTO public.interviews (
    org_id, client_email, client_name, token, status, idempotency_key, created_at, updated_at, last_activity
  ) VALUES (
    p_org_id, p_client_email, p_client_name, p_token, 'sent', p_idempotency_key, now(), now(), now()
  ) RETURNING * INTO v_interview;

  -- 7. Atomic Increment
  IF v_is_lifetime THEN
    UPDATE public.subscriptions SET lifetime_interviews_used = lifetime_interviews_used + 1, updated_at = now() WHERE org_id = p_org_id;
    
    IF p_user_id IS NOT NULL THEN
      INSERT INTO public.free_plan_identity_limits (user_id, total_used, updated_at)
        VALUES (p_user_id, 1, now())
      ON CONFLICT (user_id) DO UPDATE
        SET total_used = free_plan_identity_limits.total_used + 1, updated_at = now();
    END IF;
  ELSE
    UPDATE public.subscriptions SET interviews_used = interviews_used + 1, updated_at = now() WHERE org_id = p_org_id;
  END IF;

  -- 8. Audit Logging (Guaranteed in transaction)
  BEGIN
    INSERT INTO public.usage_audit_logs (org_id, event_type, metadata)
    VALUES (
      p_org_id, 
      'INTERVIEW_CREATED', 
      jsonb_build_object(
          'interview_id', v_interview.id, 
          'client_email', p_client_email, 
          'idempotency_key', p_idempotency_key, 
          'plan', v_sub.plan_name,
          'user_id', p_user_id,
          'timestamp', now()
      )
    );
  EXCEPTION WHEN OTHERS THEN
     -- Optional: Fallback write to events table or just ignore if it is a secondary log.
     -- Given the user wants "RELIABLE" recording, we let errors propagate to fail the transaction 
     -- unless we want it to be resilient. The USER asked for strict matching, so we will fail the transaction.
     RAISE;
  END;

  RETURN json_build_object('success', true, 'data', row_to_json(v_interview), 'is_lifetime', v_is_lifetime, 'used', v_effective_used + 1, 'limit', v_effective_limit);
END;
$$;
