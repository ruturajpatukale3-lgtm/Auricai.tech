-- Migration: Remove primary_goal from org_profile
-- This is a non-destructive migration (column removal) to simplify business context.

ALTER TABLE public.org_profile DROP COLUMN IF EXISTS primary_goal;
