-- ═══════════════════════════════════════════════════════════
-- CaseFlow — Enterprise Soft Unlimited & Rate Limiting (HARDENED)
-- Implements fair usage caps, daily limits, and abuse protection.
-- ═══════════════════════════════════════════════════════════

-- 0. Schema Hardening
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.rate_limit_cache (
  id TEXT PRIMARY KEY,
  data JSONB,
  expires_at TIMESTAMPTZ NOT NULL
);
-- Basic cleanup function to prevent unbound growth of KV store
CREATE OR REPLACE FUNCTION clean_rate_limit_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limit_cache 
  WHERE expires_at < now() AT TIME ZONE 'UTC'
  OR id NOT IN (
    SELECT id FROM public.rate_limit_cache 
    ORDER BY expires_at DESC 
    LIMIT 100000
  );
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_org ON public.interviews (org_id, idempotency_key);

-- 0. Performance Indexing
CREATE INDEX IF NOT EXISTS idx_interviews_org_created_at
ON public.interviews (org_id, created_at DESC);

-- 1. Rate Limit Checker Function
CREATE OR REPLACE FUNCTION check_rate_limits(p_org_id uuid)
RETURNS json AS $$
DECLARE
  v_daily_count int;
  v_burst_count int;
  v_abuse_count int;
  v_blocked_until timestamptz;
  v_now timestamptz = now() AT TIME ZONE 'UTC';
BEGIN
  -- 1. Check for Active Block (Priority 1)
  SELECT blocked_until INTO v_blocked_until
  FROM public.subscriptions
  WHERE org_id = p_org_id;

  IF v_blocked_until IS NOT NULL AND v_blocked_until > v_now THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ABUSE_BLOCK_ACTIVE',
      'message', 'This organization is temporarily blocked due to abnormal volume. Please wait.',
      'retry_after', FLOOR(EXTRACT(EPOCH FROM (v_blocked_until - v_now)))::int
    );
  END IF;

  -- 2. Check Abuse Trigger (100/hr) (Priority 2)
  SELECT count(*) INTO v_abuse_count
  FROM public.interviews
  WHERE org_id = p_org_id
  AND created_at > v_now - interval '1 hour';
  
  IF v_abuse_count >= 100 THEN
    -- Apply a 30-minute block
    UPDATE public.subscriptions 
    SET blocked_until = v_now + interval '30 minutes'
    WHERE org_id = p_org_id;

    RETURN json_build_object(
      'success', false,
      'error', 'ABUSE_FLAG',
      'message', 'Abnormal activity detected. Organization blocked for 30 minutes.',
      'retry_after', 1800
    );
  END IF;

  -- 3. Check Burst (5/min) (Priority 3)
  SELECT count(*) INTO v_burst_count
  FROM public.interviews
  WHERE org_id = p_org_id
  AND created_at > v_now - interval '1 minute';
  
  IF v_burst_count >= 5 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'RATE_LIMIT',
      'message', 'Burst limit reached (5/min). Please slow down.',
      'retry_after', 60
    );
  END IF;

  -- 4. Check Daily (50/cal-day) (Priority 4)
  SELECT count(*) INTO v_daily_count
  FROM public.interviews
  WHERE org_id = p_org_id
  AND created_at >= date_trunc('day', v_now); -- Calendar day logic in UTC
  
  IF v_daily_count >= 50 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DAILY_LIMIT',
      'message', 'Daily limit reached (50). Resets at midnight UTC.',
      'retry_after', FLOOR(EXTRACT(EPOCH FROM (date_trunc('day', v_now + interval '1 day') - v_now)))::int
    );
  END IF;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Increment Function for "Fair Usage" Messaging
CREATE OR REPLACE FUNCTION increment_interview_usage(p_org_id uuid)
RETURNS json AS $$
DECLARE
  v_used int;
  v_limit int;
  v_end timestamptz;
  v_plan text;
BEGIN
  -- 1. Lock and fetch current state (FOR UPDATE is CRITICAL)
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
  END IF;

  -- 3. Strict Check
  IF v_used >= v_limit THEN
    -- Specialized error for Enterprise "Soft Unlimited"
    IF v_plan = 'enterprise' THEN
      RETURN json_build_object(
        'success', false,
        'error', 'FAIR_USAGE_LIMIT',
        'message', 'You''ve reached fair usage limits. Contact support to extend capacity.',
        'upgrade_required', false
      );
    ELSE
      -- Standard error for Starter/Growth
      RETURN json_build_object(
        'success', false,
        'error', 'LIMIT_REACHED',
        'metric', 'interviews',
        'limit', v_limit,
        'used', v_used,
        'upgrade_required', true
      );
    END IF;
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

-- 3. Sync existing Enterprise limits to 1000
UPDATE public.subscriptions 
SET interviews_limit = 1000 
WHERE plan_name = 'enterprise';
