-- Migration: Add docx_storage_path to reports
-- Purpose: Store DOCX export path for generated reports (v4.6)

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS docx_storage_path text;

COMMENT ON COLUMN reports.docx_storage_path IS 'Path in Supabase Storage report-files bucket for DOCX export';
