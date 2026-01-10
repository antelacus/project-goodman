/**
 * Shared message types for chat components
 * V3.9: Created to eliminate duplicate type definitions
 * V4.2: Extended for report messages
 */

import type { ReportContent } from './report';

/**
 * Chat message displayed in the UI
 */
export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  metadata?: ChatMessageMetadata;
  // v4.2: Report message support
  messageType?: 'text' | 'report';
  reportContent?: ReportContent;
}

/**
 * Optional metadata for chat messages
 */
export interface ChatMessageMetadata {
  toolCalls?: ToolCallInfo[];
  sources?: DocumentSource[];
  thinkingSteps?: string[];
}

/**
 * Tool call information for AI responses
 */
export interface ToolCallInfo {
  id: string;
  name: string;
  status: 'pending' | 'completed' | 'failed';
  args?: Record<string, unknown>;
  result?: string;
}

/**
 * Document source reference
 */
export interface DocumentSource {
  documentId: string;
  documentName: string;
  chunkId?: string;
  relevance?: number;
}

/**
 * Props for MessageList component
 */
export interface MessageListProps {
  messages: ChatMessage[];
  currentThinking?: string | null;
  isLoading?: boolean;
  // v4.0: Process events for transparency
  processEvents?: import('./process-events').ProcessEvent[];
  // v4.2: Report actions
  onSaveReport?: () => void;
  isSavingReport?: boolean;
  savedReportPdfUrl?: string;
}
