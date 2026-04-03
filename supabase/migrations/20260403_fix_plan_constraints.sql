-- ═══════════════════════════════════════════════════════════
-- Auricai — Plan State Consistency Migration
-- ═══════════════════════════════════════════════════════════

-- 1. Update organizations.plan_type check constraint
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_plan_type_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_plan_type_check 
  CHECK (plan_type IN ('free', 'trial', 'starter', 'growth', 'enterprise'));

-- 2. Ensure subscriptions.plan_name is also updated (if constraint exists)
-- Assuming subscriptions.plan_name might have a similar constraint from previous hardening
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subscriptions_plan_name_check') THEN
        ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_plan_name_check;
    END IF;
END $$;

ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_name_check 
  CHECK (plan_name IN ('free', 'trial', 'starter', 'growth', 'enterprise'));
