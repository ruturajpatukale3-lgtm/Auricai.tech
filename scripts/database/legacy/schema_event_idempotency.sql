-- ═══════════════════════════════════════════════════════════
-- Auricai — Event Idempotency Schema Update
-- ═══════════════════════════════════════════════════════════

-- Add the tracking hash column
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_hash text;

-- Backfill hashes for existing events to prevent violation on current dataset
-- Hash is simply ID since they are already inserted
UPDATE public.events SET event_hash = id::text WHERE event_hash IS NULL;

-- Enforce uniqueness to physically reject duplicates at the database layer
ALTER TABLE public.events ADD CONSTRAINT events_event_hash_key UNIQUE (event_hash);
