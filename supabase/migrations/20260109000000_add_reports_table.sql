-- Migration: Add reports table for financial analysis reports
-- Version: v4.2
-- Date: 2026-01-09
-- Purpose: Store generated financial analysis reports with PDF export support

-- ============================================================================
-- Table: reports
-- Stores generated financial analysis reports with ownership and PDF references
-- ============================================================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Ownership (matches documents table pattern)
    owner_id UUID,
    owner_type VARCHAR(20) NOT NULL DEFAULT 'guest'
        CHECK (owner_type IN ('system', 'admin', 'user', 'guest')),

    -- Report metadata
    title VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL DEFAULT 'comprehensive_financial',

    -- Input parameters
    year VARCHAR(4) NOT NULL,
    comparison_year VARCHAR(4),

    -- Report content (full structured report as JSONB)
    content JSONB NOT NULL DEFAULT '{}',
    summary_text TEXT,

    -- PDF storage reference (Supabase Storage path)
    pdf_storage_path TEXT,

    -- Generation metadata
    generation_time_ms INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Ownership lookup (for listing user's reports)
CREATE INDEX idx_reports_owner ON reports(owner_id, owner_type);

-- Chronological listing
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- Cleanup job for expired guest reports
CREATE INDEX idx_reports_expires ON reports(expires_at)
    WHERE expires_at IS NOT NULL;

-- Year-based queries
CREATE INDEX idx_reports_year ON reports(year);

-- ============================================================================
-- Updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_reports_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reports_timestamp ON reports;
CREATE TRIGGER trigger_update_reports_timestamp
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_timestamp();

-- ============================================================================
-- Row Level Security
-- Note: Authorization enforced at application level (session/user checks in API)
-- ============================================================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to reports" ON reports;
CREATE POLICY "Allow all access to reports" ON reports
    FOR ALL USING (true);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE reports IS 'Generated financial analysis reports with PDF export';
COMMENT ON COLUMN reports.owner_id IS 'Owner UUID: users.id for admin/user, session_id for guest';
COMMENT ON COLUMN reports.owner_type IS 'Owner type: system (public), admin, user, guest (temp)';
COMMENT ON COLUMN reports.content IS 'Full structured report content as JSONB (ReportContent type)';
COMMENT ON COLUMN reports.pdf_storage_path IS 'Path in Supabase Storage report-files bucket';
COMMENT ON COLUMN reports.generation_time_ms IS 'Total time to generate report in milliseconds';
COMMENT ON COLUMN reports.expires_at IS 'Auto-cleanup time for guest reports';
