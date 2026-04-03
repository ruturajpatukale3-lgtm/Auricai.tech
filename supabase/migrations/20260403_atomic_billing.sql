-- ═══════════════════════════════════════════════════════════
-- CaseFlow — Atomic Billing & Enterprise Audit Logs
-- Single transaction guarantees for usage increment and interview persistency.
-- ═══════════════════════════════════════════════════════════

-- 1. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.usage_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- e.g., 'INTERVIEW_CREATED', 'LIMIT_BLOCKED', 'ABUSE_FLAG', 'RATE_LIMIT'
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'UTC')
);

-- Index for speedy org lookups on audit traces
CREATE INDEX IF NOT EXISTS idx_usage_audit_logs_org_id 
ON public.usage_audit_logs(org_id, created_at DESC);

-- 2. Modify check_rate_limits to inject Audit Logs
CREATE OR REPLACE FUNCTION check_rate_limits(p_org_id uuid)
RETURNS json AS $$
DECLARE
  v_daily_count int;
  v_burst_count int;
  v_abuse_count int;
  v_blocked_until timestamptz;
  v_now timestamptz = now() AT TIME ZONE 'UTC';
BEGIN
  -- Priority 1: Check for Active Block
  SELECT blocked_until INTO v_blocked_until
  FROM public.subscriptions
  WHERE org_id = p_org_id;

  IF v_blocked_until IS NOT NULL AND v_blocked_until > v_now THEN
    INSERT INTO public.usage_audit_logs (org_id, event_type, metadata)
    VALUES (p_org_id, 'LIMIT_BLOCKED', jsonb_build_object('reason', 'ABUSE_BLOCK_ACTIVE', 'blocked_until', v_blocked_until));

    RETURN json_build_object(
      'success', false,
      'error', 'ABUSE_BLOCK_ACTIVE',
      'message', 'This organization is temporarily blocked due to abnormal volume. Please wait.',
      'retry_after', FLOOR(EXTRACT(EPOCH FROM (v_blocked_until - v_now)))::int
    );
  END IF;

  -- Priority 2: Check Abuse Trigger (100/hr)
  SELECT count(*) INTO v_abuse_count
  FROM public.interviews
  WHERE org_id = p_org_id
  AND created_at > v_now - interval '1 hour';
  
  IF v_abuse_count >= 100 THEN
    -- Apply a 30-minute block
    UPDATE public.subscriptions 
    SET blocked_until = v_now + interval '30 minutes'
    WHERE org_id = p_org_id;

    INSERT INTO public.usage_audit_logs (org_id, event_type, metadata)
    VALUES (p_org_id, 'ABUSE_FLAG', jsonb_build_object('count', v_abuse_count, 'window', '1 hour'));

    RETURN json_build_object(
      'success', false,
      'error', 'ABUSE_FLAG',
      'message', 'Abnormal activity detected. Organization blocked for 30 minutes.',
      'retry_after', 1800
    );
  END IF;

  -- Priority 3: Check Burst (5/min)
  SELECT count(*) INTO v_burst_count
  FROM public.interviews
  WHERE org_id = p_org_id
  AND created_at > v_now - interval '1 minute';
  
  IF v_burst_count >= 5 THEN
    INSERT INTO public.usage_audit_logs (org_id, event_type, metadata)
    VALUES (p_org_id, 'RATE_LIMIT', jsonb_build_object('count', v_burst_count, 'window', '1 minute'));

    RETURN json_build_object(
      'success', false,
      'error', 'RATE_LIMIT',
      'message', 'Burst limit reached (5/min). Please slow down.',
      'retry_after', 60
    );
  END IF;

  -- Priority 4: Check Daily (50/cal-day)
  SELECT count(*) INTO v_daily_count
  FROM public.interviews
  WHERE org_id = p_org_id
  AND created_at >= date_trunc('day', v_now);
  
  IF v_daily_count >= 50 THEN
    INSERT INTO public.usage_audit_logs (org_id, event_type, metadata)
    VALUES (p_org_id, 'LIMIT_BLOCKED', jsonb_build_object('reason', 'DAILY_LIMIT', 'count', v_daily_count));

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


-- 3. The Atomic Transaction Wrapper
-- Merges 'increment_interview_usage' and 'InterviewRepository.create'
CREATE OR REPLACE FUNCTION create_interview_safe(
  p_org_id uuid,
  p_client_email text,
  p_client_name text,
  p_token text,
  p_idempotency_key text
) RETURNS json AS $$
DECLARE
  v_used int;
  v_limit int;
  v_end timestamptz;
  v_plan text;
  v_interview RECORD;
BEGIN
  -- 1. Lock Subscription Row
  SELECT interviews_used, interviews_limit, current_period_end, plan_name
  INTO v_used, v_limit, v_end, v_plan
  FROM public.subscriptions
  WHERE org_id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found for org %', p_org_id;
  END IF;

  -- 2. Lazy Reset
  IF v_end < (now() AT TIME ZONE 'UTC') THEN
    UPDATE public.subscriptions
    SET 
      interviews_used = 0,
      current_period_start = v_end,
      current_period_end = v_end + interval '1 month',
      updated_at = (now() AT TIME ZONE 'UTC')
    WHERE org_id = p_org_id;
    v_used := 0;
  END IF;

  -- 3. Evaluate Hard Limits
  IF v_used >= v_limit THEN
    IF v_plan = 'enterprise' THEN
      RETURN json_build_object('success', false, 'error', 'FAIR_USAGE_LIMIT', 'message', 'You''ve reached fair usage limits. Contact support.', 'upgrade_required', false);
    ELSE
      RETURN json_build_object('success', false, 'error', 'LIMIT_REACHED', 'metric', 'interviews', 'limit', v_limit, 'used', v_used, 'upgrade_required', true);
    END IF;
  END IF;

  -- 4. Execute Insertion
  INSERT INTO public.interviews (
    org_id, 
    client_email, 
    client_name, 
    token, 
    status, 
    sent_at, 
    idempotency_key, 
    created_at, 
    last_activity
  ) 
  VALUES (
    p_org_id, 
    p_client_email, 
    p_client_name, 
    p_token, 
    'sent', 
    (now() AT TIME ZONE 'UTC'), 
    p_idempotency_key, 
    (now() AT TIME ZONE 'UTC'),
    (now() AT TIME ZONE 'UTC')
  ) 
  RETURNING * INTO v_interview;

  -- 5. Execute Increment
  UPDATE public.subscriptions
  SET 
    interviews_used = interviews_used + 1,
    updated_at = (now() AT TIME ZONE 'UTC')
  WHERE org_id = p_org_id;

  -- 6. Execute Audit Logging
  INSERT INTO public.usage_audit_logs (org_id, event_type, metadata)
  VALUES (
    p_org_id, 
    'INTERVIEW_CREATED', 
    jsonb_build_object('interview_id', v_interview.id, 'client_email', p_client_email, 'idempotency_key', p_idempotency_key)
  );

  -- 7. Return Result Payload
  RETURN json_build_object(
    'success', true,
    'data', row_to_json(v_interview)
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
