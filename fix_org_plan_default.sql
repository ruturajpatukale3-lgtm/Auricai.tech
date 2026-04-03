-- Migration: Standardize Plan Default to "free"
-- This ensures organization creation never fails due to missing or invalid plan_type.

-- 1. Ensure "free" is an allowed value in the check constraint
ALTER TABLE public.organizations 
DROP CONSTRAINT IF EXISTS organizations_plan_type_check;

ALTER TABLE public.organizations 
ADD CONSTRAINT organizations_plan_type_check 
CHECK (plan_type IN ('free', 'starter', 'growth', 'enterprise'));

-- 2. Set default value to 'free'
ALTER TABLE public.organizations 
ALTER COLUMN plan_type SET DEFAULT 'free';

-- 3. Proactively update any existing null values (if any)
UPDATE public.organizations 
SET plan_type = 'free' 
WHERE plan_type IS NULL;
