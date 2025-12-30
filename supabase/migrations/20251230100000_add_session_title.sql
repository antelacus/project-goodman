-- Add session title and owner tracking to conversation_sessions
-- For sidebar session history feature

-- Add title column for auto-generated session names
ALTER TABLE conversation_sessions ADD COLUMN IF NOT EXISTS title TEXT;

-- Add owner tracking columns (links sessions to users/guests)
ALTER TABLE conversation_sessions ADD COLUMN IF NOT EXISTS owner_id TEXT;
ALTER TABLE conversation_sessions ADD COLUMN IF NOT EXISTS owner_type TEXT;

-- Add check constraint for owner_type (must be valid role type)
ALTER TABLE conversation_sessions ADD CONSTRAINT conversation_sessions_owner_type_check
  CHECK (owner_type IS NULL OR owner_type IN ('admin', 'user', 'guest'));

-- Index for efficient session lookups by owner
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_owner
  ON conversation_sessions(owner_id, owner_type);

-- Index for title searches (optional, for future search feature)
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_title
  ON conversation_sessions(title) WHERE title IS NOT NULL;
