/**
 * Unified Agent Nodes
 *
 * Wrappers for core nodes to inject specific configuration (like tool registration).
 */

import { agentLoopNode as coreAgentLoop } from "../core/nodes/agent-loop";
import { registerUnifiedTools } from "@/lib/tools";
import { UnifiedAgentState } from "./state";
import { getUnifiedAgentSystemPrompt } from "./prompts";

export { loadMemoryNode } from "../core/nodes/load-memory";
export { toolExecutorNode } from "../core/nodes/tool-executor";
export { saveMemoryNode } from "../core/nodes/save-memory";

// Module-level tool registration (runs once when module is first imported)
let toolsRegistered = false;

function ensureToolsRegistered(): void {
    if (!toolsRegistered) {
        registerUnifiedTools();
        toolsRegistered = true;
    }
}

/**
 * Unified Agent Loop Wrapper
 */
export async function unifiedAgentLoop(state: UnifiedAgentState) {
    // Ensure tools are registered (idempotent, only runs once per process)
    ensureToolsRegistered();

    // Call core loop with dynamically generated prompt (includes auto-generated tool list)
    return coreAgentLoop(state, {
        systemPrompt: getUnifiedAgentSystemPrompt()
    });
}
