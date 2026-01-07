/**
 * State Accessors
 *
 * Type-safe functions for accessing optional state fields in workflow logging.
 * These types represent legacy workflow state properties that may exist
 * in various workflow implementations.
 */

// ============================================================================
// Optional State Field Interfaces (for logging purposes)
// ============================================================================

/**
 * Routing decision state from legacy workflows
 */
interface RoutingState {
    selectedFunction?: string;
    confidence?: number;
    functionArgs?: { _reasoning?: string };
}

/**
 * Data query state from legacy workflows
 */
interface DataQueryState {
    missingMetrics?: unknown[];
    error?: string;
}

/**
 * Confidence evaluation state from legacy workflows
 */
interface ConfidenceState {
    score?: number;
    passed?: boolean;
}

/**
 * Output state from legacy workflows
 */
interface OutputState {
    type?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

function isRoutingState(value: unknown): value is RoutingState {
    return typeof value === 'object' && value !== null;
}

function isDataQueryState(value: unknown): value is DataQueryState {
    return typeof value === 'object' && value !== null;
}

function isConfidenceState(value: unknown): value is ConfidenceState {
    return typeof value === 'object' && value !== null;
}

function isOutputState(value: unknown): value is OutputState {
    return typeof value === 'object' && value !== null;
}

// ============================================================================
// State Summary Extractor
// ============================================================================

/**
 * Safely extract a log summary from any workflow state.
 * Uses type guards to ensure safe property access.
 *
 * @param state - Any workflow state object
 * @returns A summary object suitable for logging
 */
export function extractStateSummary(state: Record<string, unknown>): Record<string, unknown> {
    const summary: Record<string, unknown> = {};

    // Extract routing information
    if (state.routing && isRoutingState(state.routing)) {
        const routing = state.routing;
        summary.routing = {
            selectedFunction: routing.selectedFunction,
            confidence: routing.confidence,
            reasoning: routing.functionArgs?._reasoning,
        };
    }

    // Extract dataQuery information
    if (state.dataQuery && isDataQueryState(state.dataQuery)) {
        const dataQuery = state.dataQuery;
        summary.dataQuery = {
            missingMetrics: Array.isArray(dataQuery.missingMetrics) ? dataQuery.missingMetrics.length : 0,
            hasError: !!dataQuery.error,
        };
    }

    // Extract confidence information
    if (state.confidence && isConfidenceState(state.confidence)) {
        const confidence = state.confidence;
        summary.confidence = {
            score: confidence.score,
            passed: confidence.passed,
        };
    }

    // Extract output information
    if (state.output && isOutputState(state.output)) {
        const output = state.output;
        summary.outputType = output.type;
    }

    return summary;
}
