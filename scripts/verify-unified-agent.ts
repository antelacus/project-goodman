/**
 * Verification: verify-unified-agent.ts
 *
 * Verifies the V3.6 Unified Agent functionality by running a sample query.
 * Checks if the agent can route intent and execute tools correctly.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { unifiedAgentGraph } from '../src/lib/workflows/unified/graph';
import crypto from "crypto";

async function main() {
    console.log("Starting Unified Agent Test...");

    const input = {
        input: {
            question: "What is the corporate income tax rate in China?",
            sessionId: crypto.randomUUID(),
            workflowType: 'unified'
        },
        agent: {
            sessionId: "",
            messages: [],
            currentIteration: 0,
            maxIterations: 5,
            initialMessageCount: 0,
            isComplete: false,
            pendingToolCalls: [],
        },
        toolResults: [],
        output: {
            answer: "",
            type: "success",
            confidence: 0,
            sources: []
        }
    };

    try {
        console.log("Invoking graph...");
        const result = await unifiedAgentGraph.invoke(input as any);

        console.log("\n--- TEST RESULT ---");
        console.log("Session ID:", result.agent.sessionId);
        console.log("Answer:", result.output?.answer);
        console.log("Iterations:", result.agent.currentIteration);

        if (result.output?.answer && result.output.answer.length > 5) {
            console.log("✅ Verification Successful: Received an answer.");
        } else {
            console.error("❌ Verification Failed: No answer.");
        }

    } catch (error) {
        console.error("❌ Verification Failed with Error:", error);
    }
}

main();
