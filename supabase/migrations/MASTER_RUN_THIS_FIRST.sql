-- ═══════════════════════════════════════════════════════════
-- Auricai — MASTER MIGRATION (Run this in Supabase SQL Editor)
-- Creates subscriptions table + all billing hardening in one shot.
-- ═══════════════════════════════════════════════════════════

-- ─── STEP 1: Create subscriptions table ──────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  org_id                   UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_name                TEXT NOT NULL DEFAULT 'trial'
    CHECK (plan_name IN ('free', 'trial', 'starter', 'growth', 'enterprise')),
  interviews_limit         INTEGER NOT NULL DEFAULT 25,
  interviews_used          INTEGER NOT NULL DEFAULT 0,
  lifetime_interviews_used INTEGER NOT NULL DEFAULT 0,  -- Free plan: NEVER resets
  team_seat_limit          INTEGER NOT NULL DEFAULT 1,
  current_period_start     TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end       TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 month'),
  next_plan                TEXT,
  payment_status           TEXT NOT NULL DEFAULT 'active'
    CHECK (payment_status IN ('active', 'past_due', 'cancelled', 'refunded', 'inactive')),
  trial_end                TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  access_blocked           BOOLEAN NOT NULL DEFAULT false,
  refunded_at              TIMESTAMPTZ,
  last_synced_at           TIMESTAMPTZ,
  paddle_subscription_id   TEXT UNIQUE,
  paddle_customer_id       TEXT,
  updated_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_sub
  ON public.subscriptions (paddle_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_customer
  ON public.subscriptions (paddle_customer_id);

-- ─── STEP 2: Migrate existing orgs → subscriptions ───────

INSERT INTO public.subscriptions (
  org_id,
  plan_name,
  interviews_limit,
  interviews_used,
  team_seat_limit,
  current_period_start,
  current_period_end,
  trial_end
)
SELECT
  o.id,
  CASE
    WHEN o.plan_type IN ('free','trial','starter','growth','enterprise') THEN o.plan_type
    ELSE 'trial'
  END,
  COALESCE(u.interviews_limit, 25),
  COALESCE(u.interviews_used, 0),
  CASE
    WHEN o.plan_type = 'growth' THEN 2
    WHEN o.plan_type = 'enterprise' THEN 5
    ELSE 1
  END,
  COALESCE(o.created_at, now()),
  COALESCE(o.current_period_end, now() + interval '7 days'),
  COALESCE(o.current_period_end, now() + interval '7 days')
FROM public.organizations o
LEFT JOIN public.usage u ON o.id = u.org_id
ON CONFLICT (org_id) DO NOTHING;

-- ─── STEP 3: Auto-init subscription on new org creation ──

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
    trial_end
  ) VALUES (
    NEW.id,
    'trial',
    25,
    1,
    now(),
    now() + interval '7 days',
    now() + interval '7 days'
  )
  ON CONFLICT (org_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_init_subscription ON public.organizations;
CREATE TRIGGER trg_init_subscription
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION initialize_org_subscription();

-- ─── STEP 4: RLS ─────────────────────────────────────────

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation_select_subscriptions" ON public.subscriptions;
CREATE POLICY "org_isolation_select_subscriptions" ON public.subscriptions
  FOR SELECT USING (org_id = (auth.jwt()->>'org_id')::uuid);

-- ─── STEP 5: Support tables ───────────────────────────────

-- Rate limit cache (already used by subscription service)
CREATE TABLE IF NOT EXISTS public.rate_limit_cache (
  id         TEXT PRIMARY KEY,
  data       JSONB,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Cross-org free plan abuse prevention
CREATE TABLE IF NOT EXISTS public.free_plan_identity_limits (
  user_id       TEXT PRIMARY KEY,
  total_used    INT NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Processed webhooks (idempotency — if not already created)
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
  event_id     TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications (if not already created)
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  metadata   JSONB,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(org_id, created_at DESC);

-- ─── STEP 6: increment_interview_usage RPC ────────────────
-- Full hardened version: free=lifetime, paid=monthly, grace period, cross-org check

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

  -- Hard Block
  IF v_payment_status = 'refunded' OR v_access_blocked = TRUE THEN
    RETURN json_build_object('success', false, 'error', 'ACCESS_BLOCKED', 'message', 'Your access has been restricted.');
  END IF;

  -- FREE PLAN: lifetime counter
  IF v_plan = 'free' THEN
    IF p_user_id IS NOT NULL THEN
      SELECT COALESCE(total_used, 0) INTO v_identity_total
      FROM public.free_plan_identity_limits WHERE user_id = p_user_id;

      IF v_identity_total >= v_free_limit THEN
        RETURN json_build_object('success', false, 'error', 'FREE_LIMIT_REACHED',
          'message', 'You have used all 2 free interviews across your accounts. Upgrade to continue.',
          'limit', v_free_limit, 'used', v_identity_total, 'is_lifetime', true, 'upgrade_required', true);
      END IF;
    END IF;

    IF v_lifetime_used >= v_free_limit THEN
      RETURN json_build_object('success', false, 'error', 'FREE_LIMIT_REACHED',
        'message', 'Free plan limit reached (2 lifetime interviews). Upgrade to send more.',
        'limit', v_free_limit, 'used', v_lifetime_used, 'is_lifetime', true, 'upgrade_required', true);
    END IF;

    UPDATE public.subscriptions
    SET lifetime_interviews_used = lifetime_interviews_used + 1, updated_at = now()
    WHERE org_id = p_org_id;

    IF p_user_id IS NOT NULL THEN
      INSERT INTO public.free_plan_identity_limits (user_id, total_used, updated_at)
        VALUES (p_user_id, 1, now())
      ON CONFLICT (user_id) DO UPDATE
        SET total_used = free_plan_identity_limits.total_used + 1, updated_at = now();
    END IF;

    RETURN json_build_object('success', true, 'used', v_lifetime_used + 1, 'limit', v_free_limit, 'is_lifetime', true);
  END IF;

  -- TRIAL
  IF v_plan = 'trial' THEN
    IF now() > v_trial_end THEN
      IF v_lifetime_used >= v_free_limit THEN
        RETURN json_build_object('success', false, 'error', 'TRIAL_EXPIRED',
          'message', 'Your trial has expired. Upgrade to continue.', 'is_lifetime', true, 'upgrade_required', true);
      END IF;
      UPDATE public.subscriptions
      SET lifetime_interviews_used = lifetime_interviews_used + 1, updated_at = now()
      WHERE org_id = p_org_id;
      RETURN json_build_object('success', true, 'used', v_lifetime_used + 1, 'limit', v_free_limit, 'is_lifetime', true);
    ELSE
      v_limit := 25;
    END IF;
  -- PAST DUE grace period
  ELSIF v_payment_status = 'past_due' THEN
    IF now() > (v_end + (v_grace_days || ' days')::interval) THEN
      v_limit := v_free_limit;
    ELSE
      v_limit := LEAST(v_limit, v_used + v_grace_cap);
    END IF;
  ELSIF v_payment_status IN ('cancelled', 'inactive') AND now() > v_end THEN
    v_limit := v_free_limit;
  END IF;

  -- Monthly period reset (paid plans only)
  IF v_plan NOT IN ('trial', 'free') AND v_end < now() AND v_payment_status = 'active' THEN
    UPDATE public.subscriptions
    SET interviews_used = 0, current_period_start = v_end, current_period_end = v_end + interval '1 month', updated_at = now()
    WHERE org_id = p_org_id;
    v_used := 0;
    v_end := v_end + interval '1 month';
  END IF;

  IF v_used >= v_limit THEN
    RETURN json_build_object('success', false, 'error', 'LIMIT_REACHED',
      'metric', 'interviews', 'limit', v_limit, 'used', v_used, 'upgrade_required', true);
  END IF;

  UPDATE public.subscriptions
  SET interviews_used = interviews_used + 1, updated_at = now()
  WHERE org_id = p_org_id;

  RETURN json_build_object('success', true, 'used', v_used + 1, 'limit', v_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── STEP 7: enforce_seat_limits RPC ─────────────────────

CREATE OR REPLACE FUNCTION enforce_seat_limits(p_org_id uuid)
RETURNS void AS $$
DECLARE
  v_seat_limit INT;
  v_active_count INT;
BEGIN
  SELECT team_seat_limit INTO v_seat_limit
  FROM public.subscriptions WHERE org_id = p_org_id;

  SELECT COUNT(*) INTO v_active_count
  FROM public.team_members
  WHERE org_id = p_org_id AND status = 'active';

  IF v_active_count > v_seat_limit THEN
    UPDATE public.team_members
    SET status = 'inactive'
    WHERE org_id = p_org_id
      AND status = 'active'
      AND role != 'owner'
      AND id NOT IN (
        SELECT id FROM public.team_members
        WHERE org_id = p_org_id AND status = 'active'
        ORDER BY
          CASE role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
          joined_at ASC NULLS LAST
        LIMIT v_seat_limit
      );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── STEP 8: check_rate_limits RPC ───────────────────────

CREATE OR REPLACE FUNCTION check_rate_limits(p_org_id uuid)
RETURNS json AS $$
DECLARE
  v_daily_count INT;
  v_burst_count INT;
  v_abuse_flag  BOOLEAN := false;
  v_daily_limit CONSTANT INT := 20;
  v_burst_limit CONSTANT INT := 5;
  v_burst_window CONSTANT INTERVAL := '1 hour';
BEGIN
  SELECT COUNT(*) INTO v_daily_count
  FROM public.interviews
  WHERE org_id = p_org_id
    AND created_at >= date_trunc('day', now());

  SELECT COUNT(*) INTO v_burst_count
  FROM public.interviews
  WHERE org_id = p_org_id
    AND created_at >= now() - v_burst_window;

  IF v_burst_count >= v_burst_limit THEN
    RETURN json_build_object('success', false, 'error', 'RATE_LIMIT_EXCEEDED',
      'message', 'Too many interviews created in a short window. Please wait before sending more.',
      'retry_after', 3600);
  END IF;

  IF v_daily_count >= v_daily_limit THEN
    RETURN json_build_object('success', false, 'error', 'DAILY_LIMIT_EXCEEDED',
      'message', 'Daily interview creation limit reached. Limit resets at midnight UTC.',
      'retry_after', 86400);
  END IF;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
