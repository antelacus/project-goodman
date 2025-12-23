-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Conversation Sessions Table
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_type TEXT NOT NULL CHECK (workflow_type IN (
    'landing-chat',
    'guidance-chat',
    'financial-analysis'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_sessions_workflow_type ON conversation_sessions(workflow_type);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON conversation_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON conversation_sessions(updated_at DESC);

CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_session_timestamp ON conversation_sessions;
CREATE TRIGGER trigger_update_session_timestamp
BEFORE UPDATE ON conversation_sessions
FOR EACH ROW
EXECUTE FUNCTION update_session_timestamp();

-- Conversation Messages Table
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_call_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sequence_number INTEGER NOT NULL,
  CONSTRAINT valid_tool_calls CHECK (
    role != 'assistant' OR tool_calls IS NULL OR jsonb_typeof(tool_calls) = 'array'
  ),
  CONSTRAINT valid_tool_role CHECK (
    role != 'tool' OR tool_call_id IS NOT NULL
  ),
  CONSTRAINT unique_sequence UNIQUE (session_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_sequence ON conversation_messages(session_id, sequence_number);

-- RLS
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to sessions" ON conversation_sessions;
CREATE POLICY "Allow all access to sessions" ON conversation_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to messages" ON conversation_messages;
CREATE POLICY "Allow all access to messages" ON conversation_messages FOR ALL USING (true);
