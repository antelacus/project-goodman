import { NextRequest, NextResponse } from "next/server";
import { unifiedAgentGraph } from "@/lib/workflows/unified/graph";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message, sessionId, documentIds } = body;

        // Basic validation
        if (!message) {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

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

        // Initialize State
        // We provide a minimal initial state conforming to UnifiedAgentState
        const initialState = {
            input: {
                question: message,
                sessionId: sessionId, // MUST be in input for loadMemoryNode to read
                documentIds: documentIds || [],
            },
            agent: {
                sessionId: "", // Placeholder
                messages: [],
                currentIteration: 0,
                maxIterations: 10,
                initialMessageCount: 0,
                isComplete: false,
                pendingToolCalls: [],
            },
            // Other fields like output, tools, search, toolResults can remain undefined/empty
            // TypeScript might complain if we don't satisfy the interface fully.
            // We can cast or provide defaults.
            toolResults: [],
            output: {
                answer: "",
                type: "processing", // Initial status
                confidence: 0,
                sources: []
            }
        };

        // Invoke Graph
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const finalState = await unifiedAgentGraph.invoke(initialState as any) as any;

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

    } catch (error) {
        console.error("Chat API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        );
    }
}
