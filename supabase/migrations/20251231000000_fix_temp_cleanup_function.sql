-- Migration: Fix temporary document cleanup function
-- Version: V3.9
-- Date: 2025-12-31
-- Purpose: Update cleanup function to use V3.10 ownership model (owner_type, expires_at)
--          instead of non-existent is_temp column

-- ============================================================================
-- Update cleanup function to use expires_at instead of is_temp
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_temp_documents()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete guest documents that have expired
  -- V3.10 uses expires_at field instead of is_temp
  -- document_chunks will be cascade deleted due to FK constraint
  WITH deleted AS (
    DELETE FROM documents
    WHERE owner_type = 'guest'
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  -- Log the cleanup action
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Cleaned up % expired guest documents', deleted_count;
  END IF;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_temp_documents IS
  'Deletes expired guest documents (owner_type=guest AND expires_at < NOW()). Returns count of deleted documents. V3.9 fix: uses expires_at instead of is_temp.';

-- ============================================================================
-- Note: The pg_cron job remains unchanged as it just calls the function
-- ============================================================================
