/**
 * Unified Agent Nodes
 * 
 * Wrappers for core nodes to inject specific configuration (like tool registration).
 */

import { agentLoopNode as coreAgentLoop } from "../core/nodes/agent-loop";
import { registerUnifiedTools } from "@/lib/tools";
import { UnifiedAgentState } from "./state";
import { UNIFIED_AGENT_SYSTEM_PROMPT } from "./prompts";

export { loadMemoryNode } from "../core/nodes/load-memory";
export { toolExecutorNode } from "../core/nodes/tool-executor";
export { saveMemoryNode } from "../core/nodes/save-memory";

/**
 * Unified Agent Loop Wrapper
 */
export async function unifiedAgentLoop(state: UnifiedAgentState) {
    // Ensure tools are registered
    registerUnifiedTools();

    // Call core loop with specific prompt
    return coreAgentLoop(state, {
        systemPrompt: UNIFIED_AGENT_SYSTEM_PROMPT
    });
}
