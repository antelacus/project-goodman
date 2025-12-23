/**
 * Unified Agent State
 *
 * State definition for the main Unified Agent.
 */

import { BaseAgentState } from "../core/state/base-state";

/**
 * Unified Agent State
 *
 * For now, it is identical to BaseAgentState.
 * We extend it to allow future specific fields without breaking core.
 */
export interface UnifiedAgentState extends BaseAgentState {
    // Add specific fields here if needed in the future
    // e.g., userProfile, sessionSettings, etc.
}
