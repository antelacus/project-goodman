/**
 * SSE event types for report generation streaming
 * v4.2: Created for report-generation feature
 */

import type { ReportContent, ReportSection } from './report';

/**
 * Report generation phases
 */
export type ReportPhase = 'check' | 'gather' | 'analyze' | 'generate';

/**
 * Phase status
 */
export type ReportPhaseStatus = 'started' | 'completed';

/**
 * Phase progress event - tracks workflow phase transitions
 */
export interface ReportPhaseEvent {
  type: 'phase';
  data: {
    phase: ReportPhase;
    status: ReportPhaseStatus;
    progress?: number;              // Optional progress percentage (0-100)
  };
}

/**
 * Section generation event - tracks individual section completion
 */
export interface ReportSectionEvent {
  type: 'section';
  data: {
    sectionId: string;
    status: 'generating' | 'completed';
    content?: ReportSection;        // Included when status is 'completed'
  };
}

/**
 * Report complete event - final event with full report
 */
export interface ReportCompleteEvent {
  type: 'complete';
  data: {
    reportId: string;
    content: ReportContent;
    generationTimeMs?: number;
  };
}

/**
 * Error event - sent when an error occurs during generation
 */
export interface ReportErrorEvent {
  type: 'error';
  data: {
    message: string;
    phase?: ReportPhase;            // Phase where error occurred
    recoverable?: boolean;          // Whether the error can be retried
  };
}

/**
 * Process event - tool execution progress (optional, for detailed transparency)
 */
export interface ReportProcessEvent {
  type: 'process';
  data: {
    eventType: 'tool_call' | 'tool_result';
    toolName?: string;              // e.g., 'current_ratio'
    result?: string;                // Brief result summary
  };
}

/**
 * All SSE event types for report generation
 */
export type ReportSSEEvent =
  | ReportPhaseEvent
  | ReportSectionEvent
  | ReportCompleteEvent
  | ReportErrorEvent
  | ReportProcessEvent;

/**
 * Helper type for SSE event type discrimination
 */
export type ReportSSEEventType = ReportSSEEvent['type'];

/**
 * Phase display information for UI
 */
export interface PhaseDisplayInfo {
  id: ReportPhase;
  label: string;
  status: 'pending' | 'in_progress' | 'completed';
}

/**
 * Default phase display configuration
 */
export const REPORT_PHASES: readonly PhaseDisplayInfo[] = [
  { id: 'check', label: '检查数据', status: 'pending' },
  { id: 'gather', label: '收集指标', status: 'pending' },
  { id: 'analyze', label: '分析数据', status: 'pending' },
  { id: 'generate', label: '生成报告', status: 'pending' },
] as const;
