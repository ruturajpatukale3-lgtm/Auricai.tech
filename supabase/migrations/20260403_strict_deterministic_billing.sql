-- ═══════════════════════════════════════════════════════════
-- Auricai — Strict Deterministic Billing (Final Migration)
-- 
-- RULES:
--   1. subscriptions table = ONLY source of truth
--   2. free plan uses lifetime_interviews_used (NEVER resets)
--   3. paid plans use interviews_used (monthly, resets on period)
--   4. trial activates ONLY from free + payment success
--   5. expired trial → free (preserves lifetime counter)
-- ═══════════════════════════════════════════════════════════

-- ─── FIX 1: New orgs default to FREE, not trial ────────────
-- The trigger must default to 'free' so trial activation
-- is only possible via explicit Paddle checkout success.

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
    trial_end,
    payment_status
  ) VALUES (
    NEW.id,
    'free',        -- ← STRICT: always start as free
    2,             -- ← lifetime limit
    1,
    now(),
    now() + interval '100 years',  -- free plan: no billing cycle
    NULL,          -- ← no trial until activated
    'active'
  )
  ON CONFLICT (org_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_init_subscription ON public.organizations;
CREATE TRIGGER trg_init_subscription
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION initialize_org_subscription();


-- ─── FIX 2: Overhaul increment_interview_usage ─────────────
-- Strict separation: free=lifetime, all others=monthly.
-- No mixing. No ambiguity.

CREATE OR REPLACE FUNCTION increment_interview_usage(
  p_org_id  uuid,
  p_user_id TEXT DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_used               INT;
  v_limit              INT;
  v_lifetime_used      INT;
  v_end                TIMESTAMPTZ;
  v_trial_end          TIMESTAMPTZ;
  v_plan               TEXT;
  v_payment_status     TEXT;
  v_access_blocked     BOOLEAN;
  v_identity_total     INT := 0;
  v_grace_days CONSTANT INT := 3;
  v_grace_cap  CONSTANT INT := 5;
  v_free_limit CONSTANT INT := 2;
BEGIN
  -- 1. Lock and fetch current state
  SELECT
    interviews_used,
    interviews_limit,
    lifetime_interviews_used,
    current_period_end,
    trial_end,
    plan_name,
    payment_status,
    access_blocked
  INTO
    v_used, v_limit, v_lifetime_used, v_end, v_trial_end, v_plan, v_payment_status, v_access_blocked
  FROM public.subscriptions
  WHERE org_id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'SUBSCRIPTION_NOT_FOUND');
  END IF;

  -- 2. Hard Block: Refunded or Admin Blocked
  IF v_payment_status = 'refunded' OR v_access_blocked = TRUE THEN
    RETURN json_build_object('success', false, 'error', 'ACCESS_BLOCKED',
      'message', 'Your access has been restricted.');
  END IF;

  -- ═══════════════════════════════════════════════════════════
  -- PATH A: FREE PLAN (lifetime counter ONLY)
  -- ═══════════════════════════════════════════════════════════
  IF v_plan = 'free' THEN
    -- Cross-org abuse check
    IF p_user_id IS NOT NULL THEN
      SELECT COALESCE(total_used, 0) INTO v_identity_total
      FROM public.free_plan_identity_limits WHERE user_id = p_user_id;

      IF v_identity_total >= v_free_limit THEN
        RETURN json_build_object('success', false, 'error', 'FREE_LIMIT_REACHED',
          'message', 'You have used all free interviews across your accounts. Upgrade to continue.',
          'limit', v_free_limit, 'used', v_identity_total,
          'is_lifetime', true, 'upgrade_required', true);
      END IF;
    END IF;

    -- Org-level lifetime check
    IF v_lifetime_used >= v_free_limit THEN
      RETURN json_build_object('success', false, 'error', 'FREE_LIMIT_REACHED',
        'message', 'Free plan limit reached. Upgrade to send more interviews.',
        'limit', v_free_limit, 'used', v_lifetime_used,
        'is_lifetime', true, 'upgrade_required', true);
    END IF;

    -- Increment lifetime counter ONLY (never interviews_used)
    UPDATE public.subscriptions
    SET lifetime_interviews_used = lifetime_interviews_used + 1, updated_at = now()
    WHERE org_id = p_org_id;

    IF p_user_id IS NOT NULL THEN
      INSERT INTO public.free_plan_identity_limits (user_id, total_used, updated_at)
        VALUES (p_user_id, 1, now())
      ON CONFLICT (user_id) DO UPDATE
        SET total_used = free_plan_identity_limits.total_used + 1, updated_at = now();
    END IF;

    RETURN json_build_object('success', true,
      'used', v_lifetime_used + 1, 'limit', v_free_limit, 'is_lifetime', true);
  END IF;

  -- ═══════════════════════════════════════════════════════════
  -- PATH B: TRIAL PLAN (monthly counter, but check expiry first)
  -- ═══════════════════════════════════════════════════════════
  IF v_plan = 'trial' THEN
    IF v_trial_end IS NOT NULL AND now() > v_trial_end THEN
      -- Trial expired → effectively free now
      -- DO NOT increment anything. Return error so UI triggers upgrade.
      RETURN json_build_object('success', false, 'error', 'TRIAL_EXPIRED',
        'message', 'Your trial has expired. Upgrade to continue.',
        'is_lifetime', true, 'upgrade_required', true,
        'used', v_lifetime_used, 'limit', v_free_limit);
    END IF;
    -- Active trial: enforce 25-interview limit
    v_limit := 25;
  END IF;

  -- ═══════════════════════════════════════════════════════════
  -- PATH C: PAID PLANS (monthly counter with period reset)
  -- ═══════════════════════════════════════════════════════════

  -- Resolve effective limits for degraded states
  IF v_payment_status = 'past_due' THEN
    IF now() > (v_end + (v_grace_days || ' days')::interval) THEN
      v_limit := v_free_limit;  -- Grace period exhausted
    ELSE
      v_limit := LEAST(v_limit, v_used + v_grace_cap);  -- Capped during grace
    END IF;
  ELSIF v_payment_status IN ('cancelled', 'inactive') AND now() > v_end THEN
    v_limit := v_free_limit;  -- Subscription expired
  END IF;

  -- Lazy period reset (paid plans only, NOT trial or free)
  IF v_plan NOT IN ('trial', 'free') AND v_end < now() AND v_payment_status = 'active' THEN
    UPDATE public.subscriptions
    SET interviews_used = 0,
        current_period_start = v_end,
        current_period_end = v_end + interval '1 month',
        updated_at = now()
    WHERE org_id = p_org_id;
    v_used := 0;
    v_end := v_end + interval '1 month';
  END IF;

  -- Final monthly limit check
  IF v_used >= v_limit THEN
    RETURN json_build_object('success', false, 'error', 'LIMIT_REACHED',
      'metric', 'interviews', 'limit', v_limit, 'used', v_used,
      'upgrade_required', true);
  END IF;

  -- Increment monthly counter ONLY (never lifetime_interviews_used)
  UPDATE public.subscriptions
  SET interviews_used = interviews_used + 1, updated_at = now()
  WHERE org_id = p_org_id;

  RETURN json_build_object('success', true, 'used', v_used + 1, 'limit', v_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
