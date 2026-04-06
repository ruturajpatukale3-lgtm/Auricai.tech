-- ═══════════════════════════════════════════════════════════
-- Auricai — REQUIRED CORE LOGIC (RUN THIS TO FIX DASHBOARD & INTERVIEWS)
-- ═══════════════════════════════════════════════════════════

-- 1. Create the Deal Event Trigger (For Command Center Feed)
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_deal_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.events (org_id, type, entity_id, metadata, created_at)
    VALUES (NEW.org_id, 'deal_created', NEW.id, 
      jsonb_build_object('deal_name', NEW.name, 'deal_value', NEW.value, 'deal_status', NEW.status), NOW());
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.events (org_id, type, entity_id, metadata, created_at)
      VALUES (NEW.org_id, 'deal_status_changed', NEW.id, 
        jsonb_build_object('deal_name', NEW.name, 'deal_value', NEW.value, 'old_status', OLD.status, 'new_status', NEW.status), NOW());
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS deal_event_trigger ON public.deals;
CREATE TRIGGER deal_event_trigger
AFTER INSERT OR UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.log_deal_event();


-- 2. Create the Interview Safe RPC (For Creating Interviews)
-- ───────────────────────────────────────────────────────────
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
  -- 1. Idempotency Check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_interview FROM public.interviews 
    WHERE org_id = p_org_id AND idempotency_key = p_idempotency_key LIMIT 1;
    IF v_interview.id IS NOT NULL THEN
      RETURN json_build_object('success', true, 'data', row_to_json(v_interview), 'is_idempotent_hit', true);
    END IF;
  END IF;

  -- 2. Fetch current subscription state
  SELECT plan_name, interviews_used, lifetime_interviews_used, interviews_limit, trial_end, current_period_end, payment_status, access_blocked
  INTO v_sub FROM public.subscriptions WHERE org_id = p_org_id FOR UPDATE;

  IF v_sub.plan_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'SUBSCRIPTION_NOT_FOUND');
  END IF;

  -- 3. Validation Logic (Simplified for this snippet)
  IF v_sub.plan_name = 'free' THEN
    IF v_sub.lifetime_interviews_used >= v_free_limit THEN
      RETURN json_build_object('success', false, 'error', 'FREE_LIMIT_REACHED');
    END IF;
    v_is_lifetime := true;
    v_effective_limit := v_free_limit;
    v_effective_used := v_sub.lifetime_interviews_used;
  ELSE
    v_effective_limit := CASE WHEN v_sub.plan_name = 'trial' THEN v_trial_limit ELSE v_sub.interviews_limit END;
    v_effective_used := v_sub.interviews_used;
    IF v_effective_used >= v_effective_limit THEN
      RETURN json_build_object('success', false, 'error', 'LIMIT_REACHED');
    END IF;
  END IF;

  -- 4. Atomic Insertion
  INSERT INTO public.interviews (org_id, client_email, client_name, token, status, idempotency_key, created_at, updated_at, last_activity)
  VALUES (p_org_id, p_client_email, p_client_name, p_token, 'sent', p_idempotency_key, now(), now(), now())
  RETURNING * INTO v_interview;

  -- 5. Atomic Increment
  IF v_is_lifetime THEN
    UPDATE public.subscriptions SET lifetime_interviews_used = lifetime_interviews_used + 1, updated_at = now() WHERE org_id = p_org_id;
  ELSE
    UPDATE public.subscriptions SET interviews_used = interviews_used + 1, updated_at = now() WHERE org_id = p_org_id;
  END IF;

  RETURN json_build_object('success', true, 'data', row_to_json(v_interview), 'is_lifetime', v_is_lifetime, 'used', v_effective_used + 1, 'limit', v_effective_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
