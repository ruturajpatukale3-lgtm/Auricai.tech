-- ═══════════════════════════════════════════════════════════
-- CaseFlow — Production Hardening Migration
-- 1. Cleanup Legacy Tables
-- 2. Performance Indices for Scalable Data Fetching
-- ═══════════════════════════════════════════════════════════

-- 1. Drop Legacy Activities Table (Consolidated into 'events')
DROP TABLE IF EXISTS activities;

-- 2. Optimize Analytics (Events Table Indices)
-- Purpose: Accelerate organization-specific kpi aggregation and activity feed lookups.
CREATE INDEX IF NOT EXISTS idx_events_org_created ON events (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events (type, org_id);

-- 3. Optimize Pipeline Extraction (Interviews Table Indices)
-- Purpose: Speed up status-based counting and stalled interview detection.
CREATE INDEX IF NOT EXISTS idx_interviews_org_status ON interviews (org_id, status);
CREATE INDEX IF NOT EXISTS idx_interviews_activity ON interviews (org_id, last_activity);

-- 4. Optimize Revenue Tracking (Case Studies Table Indices)
-- Purpose: Faster ROI-based sorting and pipeline summation.
CREATE INDEX IF NOT EXISTS idx_case_studies_org_status ON case_studies (org_id, status);
CREATE INDEX IF NOT EXISTS idx_case_studies_roi ON case_studies (org_id, delta_percent DESC) WHERE status = 'live';

-- 5. Helper Function: Count Distinct Visitor IDs
-- Used by AnalyticsService.getUniqueVisitorCount for performant high-cardinality counts.
CREATE OR REPLACE FUNCTION count_distinct_visitor_ids(p_org_id UUID, p_days INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT (metadata->>'visitor_id'))
        FROM events
        WHERE org_id = p_org_id
        AND created_at >= NOW() - (p_days || ' days')::INTERVAL
        AND metadata->>'visitor_id' IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
