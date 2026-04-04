-- ═══════════════════════════════════════════════════════════
-- FIX: Create missing DB objects required by interview flow
-- 
-- ROOT CAUSE: The migration 20260404_non_negotiable_billing_hardening.sql
-- was never applied to the remote Supabase database.
-- 
-- Missing objects:
--   1. interviews.idempotency_key column
--   2. interviews.updated_at column
--   3. usage_audit_logs table
--   4. create_interview_safe() RPC function
-- ═══════════════════════════════════════════════════════════

-- ─── STEP 1: Add missing columns to interviews table ──────

ALTER TABLE public.interviews 
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_interviews_idempotency 
  ON public.interviews(org_id, idempotency_key);

-- ─── STEP 2: Create usage_audit_logs table ─────────────────

CREATE TABLE IF NOT EXISTS public.usage_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_audit_org 
  ON public.usage_audit_logs(org_id, created_at DESC);

-- ─── STEP 3: Add trial_consumed column to subscriptions ────

ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS trial_consumed BOOLEAN NOT NULL DEFAULT false;

-- Ensure strict constraints on plan_name
DO $$ 
BEGIN
    ALTER TABLE public.subscriptions 
    DROP CONSTRAINT IF EXISTS subscriptions_plan_name_check;
    
    ALTER TABLE public.subscriptions 
    ADD CONSTRAINT subscriptions_plan_name_check 
    CHECK (plan_name IN ('free', 'trial', 'starter', 'growth', 'enterprise'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- ─── STEP 4: Create the canonical create_interview_safe RPC ───

CREATE OR REPLACE FUNCTION create_interview_safe(
  p_org_id uuid,
  p_client_email text,
  p_client_name text,
  p_token text,
  p_idempotency_key text,
  p_user_id text DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_sub RECORD;
  v_interview RECORD;
  v_identity_total INT := 0;
  v_free_limit CONSTANT INT := 2;
  v_trial_limit CONSTANT INT := 25;
  v_effective_limit INT;
  v_effective_used INT;
  v_is_lifetime BOOLEAN := false;
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
    plan_name, 
    interviews_used, 
    lifetime_interviews_used, 
    interviews_limit, 
    trial_end, 
    current_period_end, 
    payment_status, 
    access_blocked
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
    -- Monthly Period Lazy Reset (Paid plans only)
    IF v_sub.plan_name NOT IN ('trial', 'free') AND (v_sub.current_period_end IS NOT NULL AND now() > v_sub.current_period_end) THEN
      UPDATE public.subscriptions 
      SET interviews_used = 0, current_period_start = current_period_end, current_period_end = current_period_end + interval '1 month', updated_at = now()
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

  -- 8. Audit Logging
  INSERT INTO public.usage_audit_logs (org_id, event_type, metadata)
  VALUES (
    p_org_id, 
    'INTERVIEW_CREATED', 
    jsonb_build_object('interview_id', v_interview.id, 'client_email', p_client_email, 'idempotency_key', p_idempotency_key, 'plan', v_sub.plan_name)
  );

  RETURN json_build_object('success', true, 'data', row_to_json(v_interview), 'is_lifetime', v_is_lifetime, 'used', v_effective_used + 1, 'limit', v_effective_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
