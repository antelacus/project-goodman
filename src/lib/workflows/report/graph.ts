/**
 * Report Workflow Graph
 *
 * Main LangGraph definition for the report generation workflow.
 * v4.2: Independent workflow for financial analysis reports.
 *
 * Flow:
 * START → checkDataAvailability → [proceed?] → gatherMetrics → gatherContext
 *                                    ↓ error
 *                                   END
 *         → analyzeSections → assembleReport → END
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import type { ReportWorkflowState } from './state';
import {
  checkDataAvailabilityNode,
  gatherMetricsNode,
  gatherContextNode,
  analyzeSectionsNode,
  assembleReportNode,
} from './nodes';
import { shouldProceed } from './edges';

// ============================================================================
// Graph Definition
// ============================================================================

// Define the graph with relaxed typing for node names
// LangGraph's strict typing conflicts with dynamic node addition
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const workflow: any = new StateGraph<ReportWorkflowState>({
  channels: {
    input: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: (left?: any, right?: any) => (right !== undefined ? right : left),
      default: () => ({
        year: '',
        ownerId: '',
        ownerType: 'guest' as const,
      }),
    },
    dataAvailability: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: (left?: any, right?: any) => (right !== undefined ? right : left),
      default: () => ({
        primaryYearAvailable: false,
        comparisonYearAvailable: false,
        partialComparison: false,
        availableYears: [],
        status: 'pending' as const,
      }),
    },
    metricResults: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: (left?: any, right?: any) => (right !== undefined ? right : left),
      default: () => ({
        primary: {},
        comparison: {},
        status: 'pending' as const,
      }),
    },
    contextDocuments: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: (left?: any, right?: any) => (right !== undefined ? right : left),
      default: () => ({
        sourceDocuments: [],
      }),
    },
    sections: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: (left?: any[], right?: any[]) => (right !== undefined ? right : left || []),
      default: () => [],
    },
    report: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: (left?: any, right?: any) => (right !== undefined ? right : left),
      default: () => undefined,
    },
    meta: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: (left?: any, right?: any) => (right !== undefined ? right : left),
      default: () => ({
        startTime: Date.now(),
        currentPhase: 1 as const,
      }),
    },
  },
});

// ============================================================================
// Add Nodes
// ============================================================================

workflow.addNode('checkDataAvailability', checkDataAvailabilityNode);
workflow.addNode('gatherMetrics', gatherMetricsNode);
workflow.addNode('gatherContext', gatherContextNode);
workflow.addNode('analyzeSections', analyzeSectionsNode);
workflow.addNode('assembleReport', assembleReportNode);

// ============================================================================
// Add Edges
// ============================================================================

// Start with data availability check
workflow.addEdge(START, 'checkDataAvailability');

// Conditional: proceed to gather or end on error
workflow.addConditionalEdges(
  'checkDataAvailability',
  shouldProceed,
  {
    proceed: 'gatherMetrics',
    error: END,
  }
);

// Linear flow: gatherMetrics → gatherContext → analyzeSections → assembleReport → END
workflow.addEdge('gatherMetrics', 'gatherContext');
workflow.addEdge('gatherContext', 'analyzeSections');
workflow.addEdge('analyzeSections', 'assembleReport');
workflow.addEdge('assembleReport', END);

// ============================================================================
// Compile and Export
// ============================================================================

/**
 * Compiled report workflow graph
 *
 * Usage:
 * ```typescript
 * import { reportWorkflowGraph } from '@/lib/workflows/report/graph';
 *
 * const result = await reportWorkflowGraph.invoke({
 *   input: {
 *     year: '2024',
 *     comparisonYear: '2023',
 *     ownerId: 'session-id',
 *     ownerType: 'guest',
 *   },
 * });
 *
 * console.log(result.report);
 * ```
 */
export const reportWorkflowGraph = workflow.compile();
