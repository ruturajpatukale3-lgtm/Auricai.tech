-- ═══════════════════════════════════════════════════════════
-- Auricai — Free Plan Lifetime Limit Hardening
-- Free = 2 interviews LIFETIME (never resets, cross-org enforced)
-- ═══════════════════════════════════════════════════════════

-- 1. Add lifetime_interviews_used to subscriptions
-- Only incremented for free plan. NEVER reset by monthly logic.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS lifetime_interviews_used INT NOT NULL DEFAULT 0;

-- 2. Cross-org abuse prevention table
-- Tracks cumulative free-plan usage per Clerk userId across ALL their orgs.
-- If a user burns 2 interviews in org A, then creates org B — still blocked.
CREATE TABLE IF NOT EXISTS public.free_plan_identity_limits (
  user_id       TEXT PRIMARY KEY,           -- Clerk userId (stable identity anchor)
  total_used    INT NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Perf index
CREATE INDEX IF NOT EXISTS idx_free_plan_identity_limits_user_id
  ON public.free_plan_identity_limits (user_id);

-- ─── Updated increment_interview_usage RPC ────────────────
-- Accepts p_user_id for cross-org free plan enforcement.
-- For FREE plan:  uses lifetime_interviews_used (never resets)
-- For paid plans: uses interviews_used (monthly, resets with period)
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_interview_usage(
  p_org_id  uuid,
  p_user_id TEXT DEFAULT NULL  -- Clerk userId (optional; required for free plan cross-org check)
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
  v_free_lifetime_limit CONSTANT INT := 2;
BEGIN
  -- 1. Lock row and fetch full state
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
    v_used,
    v_limit,
    v_lifetime_used,
    v_end,
    v_trial_end,
    v_plan,
    v_payment_status,
    v_access_blocked
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

  -- ─── FREE PLAN BRANCH ─────────────────────────────────────
  -- Uses LIFETIME counter, never resets, cross-org checked.
  IF v_plan = 'free' THEN

    -- Cross-org identity check (if userId provided)
    IF p_user_id IS NOT NULL THEN
      SELECT COALESCE(total_used, 0)
      INTO v_identity_total
      FROM public.free_plan_identity_limits
      WHERE user_id = p_user_id;

      -- Identity-level block (used across all orgs)
      IF v_identity_total >= v_free_lifetime_limit THEN
        RETURN json_build_object(
          'success', false,
          'error', 'FREE_LIMIT_REACHED',
          'message', 'You have used all 2 free interviews across your accounts. Upgrade to continue.',
          'limit', v_free_lifetime_limit,
          'used', v_identity_total,
          'is_lifetime', true,
          'upgrade_required', true
        );
      END IF;
    END IF;

    -- Org-level lifetime block (safety net even without userId)
    IF v_lifetime_used >= v_free_lifetime_limit THEN
      RETURN json_build_object(
        'success', false,
        'error', 'FREE_LIMIT_REACHED',
        'message', 'Free plan limit reached (2 lifetime interviews). Upgrade to send more.',
        'limit', v_free_lifetime_limit,
        'used', v_lifetime_used,
        'is_lifetime', true,
        'upgrade_required', true
      );
    END IF;

    -- Increment lifetime counter on subscriptions
    UPDATE public.subscriptions
    SET
      lifetime_interviews_used = lifetime_interviews_used + 1,
      updated_at = now()
    WHERE org_id = p_org_id;

    -- Increment or insert identity-level counter
    IF p_user_id IS NOT NULL THEN
      INSERT INTO public.free_plan_identity_limits (user_id, total_used, updated_at)
        VALUES (p_user_id, 1, now())
      ON CONFLICT (user_id)
        DO UPDATE SET
          total_used = free_plan_identity_limits.total_used + 1,
          updated_at = now();
    END IF;

    RETURN json_build_object(
      'success', true,
      'used', v_lifetime_used + 1,
      'limit', v_free_lifetime_limit,
      'is_lifetime', true
    );
  END IF;
  -- ─── END FREE PLAN BRANCH ────────────────────────────────

  -- ─── TRIAL / PAID PLAN BRANCHES ──────────────────────────

  -- 3. Resolve effective limits for non-free plans
  IF v_plan = 'trial' THEN
    IF now() > v_trial_end THEN
      -- Trial expired → treat as free, block if lifetime used up
      IF v_lifetime_used >= v_free_lifetime_limit THEN
        RETURN json_build_object(
          'success', false,
          'error', 'TRIAL_EXPIRED',
          'message', 'Your trial has expired. You are now on the Free plan (2 lifetime interviews). Upgrade to continue.',
          'is_lifetime', true,
          'upgrade_required', true
        );
      END IF;
      -- Still has some free quota — treat like free
      v_limit := v_free_lifetime_limit;
    ELSE
      v_limit := 25; -- Active trial
    END IF;
  ELSIF v_payment_status = 'past_due' THEN
    IF now() > (v_end + (v_grace_days || ' days')::interval) THEN
      v_limit := v_free_lifetime_limit; -- Grace expired → free tier limits
    ELSE
      -- Within grace: cap at (used + grace_cap)
      v_limit := LEAST(v_limit, v_used + v_grace_cap);
    END IF;
  ELSIF v_payment_status = 'cancelled' AND now() > v_end THEN
    v_limit := v_free_lifetime_limit;
  ELSIF v_payment_status = 'inactive' THEN
    v_limit := v_free_lifetime_limit;
  END IF;

  -- 4. Monthly Period Reset (Lazy) — paid plans only
  IF v_plan NOT IN ('trial', 'free') AND v_end < now() AND v_payment_status = 'active' THEN
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

  -- 5. Limit check (monthly counter for paid, lifetime for expired states)
  IF v_plan = 'trial' AND now() > v_trial_end THEN
    -- Use lifetime counter for expired trial
    IF v_lifetime_used >= v_limit THEN
      RETURN json_build_object(
        'success', false,
        'error', 'TRIAL_EXPIRED',
        'message', 'Your trial has expired. Upgrade to continue.',
        'is_lifetime', true,
        'upgrade_required', true
      );
    END IF;
    -- Increment lifetime counter
    UPDATE public.subscriptions
    SET
      lifetime_interviews_used = lifetime_interviews_used + 1,
      updated_at = now()
    WHERE org_id = p_org_id;

    RETURN json_build_object(
      'success', true,
      'used', v_lifetime_used + 1,
      'limit', v_limit,
      'is_lifetime', true
    );
  END IF;

  -- Standard monthly limit check
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

  -- 6. Standard monthly increment
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
