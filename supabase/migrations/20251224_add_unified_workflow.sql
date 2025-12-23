-- Add 'unified' to conversation_sessions check constraint
ALTER TABLE conversation_sessions DROP CONSTRAINT conversation_sessions_workflow_type_check;

ALTER TABLE conversation_sessions ADD CONSTRAINT conversation_sessions_workflow_type_check 
CHECK (workflow_type IN (
  'landing-chat',
  'guidance-chat',
  'financial-analysis',
  'data-extract',
  'unified'
));
