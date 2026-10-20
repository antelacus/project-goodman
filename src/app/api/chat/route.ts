import { newQuestionState } from "@/lib/workflows/core/state/base-state";
import { NextRequest, NextResponse } from "next/server";
import { unifiedAgentGraph } from "@/lib/workflows/unified/graph";
import { createServerSupabaseClient } from "@/lib/database";
import { generateRequestId, createErrorResponse } from "@/lib/security";
import { ChatRequestSchema, validateRequest } from "@/lib/validation/api-schemas";
import type { UnifiedAgentState } from "@/lib/workflows/unified/state";

export async function POST(req: NextRequest) {
    const requestId = req.headers.get('x-request-id') || generateRequestId();

    try {
        const body = await req.json();

        // Validate request body structure with Zod
        const validationResult = validateRequest(ChatRequestSchema, body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: validationResult.error },
                { status: 400 }
            );
        }

        const { message, sessionId, documentIds } = validationResult.data;

        // Ensure user is authenticated (using Supabase middleware logic usually, checking here explicitly)
        const supabase = createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            // Allow demo usage? V3 guidelines usually imply authenticated or guarded. 
            // checkAndIncreaseApiLimit is used in other places.
            // For now, return 401 if strict, or proceed if allowed. 
            // Given V3 context, we should probably check auth.
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Initialize State conforming to UnifiedAgentState
        const initialState: UnifiedAgentState = {
            input: {
                question: message,
                sessionId: sessionId, // MUST be in input for loadMemoryNode to read
                documentIds: documentIds || [],
            },
            agent: {
                sessionId: "", // Placeholder, will be set by loadMemoryNode
                messages: [],
                currentIteration: 0,
                maxIterations: 10,
                initialMessageCount: 0,
                isComplete: false,
                pendingToolCalls: [],
                ...newQuestionState(),
            },
            toolResults: [],
            // output is optional in UnifiedAgentState, will be populated by workflow
        };

        // Invoke Graph
        const finalState = await unifiedAgentGraph.invoke(initialState) as UnifiedAgentState;

        // Return Output
        return NextResponse.json({
            success: true,
            data: {
                sessionId: finalState?.agent?.sessionId || body.sessionId, // Return the actual (possibly new) session ID
                answer: finalState?.output?.answer || "No answer generated",
                sources: finalState?.output?.sources || [],
                toolResults: finalState?.toolResults || [], // Optional: return tool traces for debug/UI
            }
        });

    } catch (error: unknown) {
        console.error("Chat API Error:", error);
        return createErrorResponse(error, requestId, 500);
    }
}
