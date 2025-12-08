-- Migration: Add automatic cleanup for temporary documents
-- Date: 2025-01-13
-- Purpose: Enable pg_cron and schedule automatic deletion of temp documents older than 24 hours

-- ============================================================================
-- Step 1: Enable pg_cron extension
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage to postgres role (required for Supabase)
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ============================================================================
-- Step 2: Create cleanup function
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_temp_documents()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete temporary documents older than 24 hours
  -- document_chunks will be cascade deleted due to FK constraint
  WITH deleted AS (
    DELETE FROM documents
    WHERE is_temp = true
      AND created_at < NOW() - INTERVAL '24 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  -- Log the cleanup action
  RAISE NOTICE 'Cleaned up % temporary documents', deleted_count;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_temp_documents IS 'Deletes temporary documents (is_temp=true) older than 24 hours. Returns count of deleted documents.';

-- ============================================================================
-- Step 3: Schedule the cleanup job (runs every hour)
-- ============================================================================

-- Remove existing job if it exists (for idempotency)
SELECT cron.unschedule('cleanup-temp-documents')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-temp-documents'
);

-- Schedule new job: runs at minute 0 of every hour
SELECT cron.schedule(
  'cleanup-temp-documents',           -- job name
  '0 * * * *',                        -- cron expression: every hour at minute 0
  'SELECT cleanup_temp_documents()'   -- SQL to execute
);

-- ============================================================================
-- Step 4: Verify setup (optional manual test)
-- ============================================================================

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for automatic temp document cleanup';
