import { NextRequest, NextResponse } from 'next/server';
import { unifiedAgentGraph } from '@/lib/workflows/unified/graph';

export const runtime = 'nodejs'; // Ensure Node.js runtime for LangGraph

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { question, sessionId, files, documentIds } = body;

        if (!question) {
            return NextResponse.json(
                { error: 'Missing question in request body' },
                { status: 400 }
            );
        }

        // Don't generate UUID here - let loadMemoryNode create/load the session
        // This ensures sessionId consistency between what's stored and what's returned

        // Initialize state
        // We cast to any to avoid strict type checking on DeepPartial,
        // but the structure matches UnifiedAgentState.
        const initialState: any = {
            input: {
                question,
                sessionId: sessionId, // Pass as-is (can be undefined), loadMemoryNode will handle
                files: files || [],
                documentIds: documentIds || [],
                workflowType: 'unified'
            },
            agent: {
                sessionId: "", // Will be set by loadMemoryNode
                messages: [],
                currentIteration: 0,
                maxIterations: 10,
                initialMessageCount: 0,
                isComplete: false,
                pendingToolCalls: [],
            },
            // Initialize other required fields as empty to satisfy graph structure
            toolResults: [],
            meta: {}
        };

        const stream = new ReadableStream({
            async start(controller) {
                const sendEvent = (type: string, data: any) => {
                    const formattedData = JSON.stringify(data);
                    controller.enqueue(`event: ${type}\ndata: ${formattedData}\n\n`);
                };

                try {
                    // Use streamEvents to get fine-grained events from the graph execution
                    const eventStream = await unifiedAgentGraph.streamEvents(
                        initialState,
                        { version: 'v2' }
                    );

                    let finalOutput = null;
                    let capturedSessionId: string | null = null; // Capture sessionId from loadMemory

                    for await (const event of eventStream) {
                        // Filter events to send meaningful updates to the client

                        // 1. Thinking: when a node starts (excluding the root graph and internal Runnables)
                        if (event.event === 'on_chain_start' && event.name && event.name !== 'LangGraph' && !event.name.startsWith('Runnable')) {
                            sendEvent('thinking', { node: event.name });
                        }

                        // 2. Tool Call: when the agent decides to call a tool
                        else if (event.event === 'on_tool_start') {
                            sendEvent('tool_call', { tool: event.name, input: event.data.input });
                        }

                        // 3. Tool Result: when a tool execution finishes
                        else if (event.event === 'on_tool_end') {
                            sendEvent('tool_result', { tool: event.name, output: event.data.output });
                        }

                        // 4. Capture sessionId from loadMemory node (this is the authoritative session ID)
                        else if (event.event === 'on_chain_end' && event.name === 'loadMemory') {
                            if (event.data?.output?.agent?.sessionId) {
                                capturedSessionId = event.data.output.agent.sessionId;
                            }
                        }

                        // 5. Capture Final Output: Look for the end of the main graph execution
                        // OR the end of the generateResponse node which produces the output
                        else if (event.event === 'on_chain_end' && event.name === 'generateResponse') {
                            if (event.data && event.data.output && event.data.output.output) {
                                // generateResponseNode returns { output: { ... } }
                                // event.data.output is that return value.
                                finalOutput = event.data.output;
                            }
                        }
                        else if (event.event === 'on_chain_end' && event.name === 'LangGraph') {
                            if (event.data && event.data.output) {
                                finalOutput = event.data.output;
                            }
                        }
                    }

                    // Send the complete event with the final answer
                    // Logic to robustly handle different structures of finalOutput
                    let outputData = null;

                    if (finalOutput) {
                        if (finalOutput.output) {
                            // Standard State structure or generateResponse structure
                            // Check if .output is the WorkflowOutput object
                            if (finalOutput.output.answer) {
                                outputData = finalOutput.output;
                            } else {
                                // Maybe finalOutput.output IS the answer string? (Unlikely given TS types)
                                // Or maybe finalOutput IS the state, containing .output
                                outputData = finalOutput.output;
                            }
                        } else if (finalOutput.answer) {
                            // finalOutput itself is the WorkflowOutput object
                            outputData = finalOutput;
                        }
                    }

                    if (outputData && outputData.answer) {
                        // Use the session ID captured from loadMemory node (most authoritative source)
                        // Falls back to finalOutput.agent.sessionId or the user-provided sessionId
                        let returnedSessionId = capturedSessionId;
                        if (!returnedSessionId && finalOutput?.agent?.sessionId) {
                            returnedSessionId = finalOutput.agent.sessionId;
                        }
                        if (!returnedSessionId) {
                            returnedSessionId = sessionId || 'unknown';
                        }

                        sendEvent('complete', {
                            sessionId: returnedSessionId,
                            ...outputData
                        });
                    } else {
                        // Fallback: If we couldn't capture the output
                        // Check if we have an error in the output metadata
                        if (finalOutput && finalOutput.meta && finalOutput.meta.error) {
                            sendEvent('error', { message: finalOutput.meta.error.message });
                        } else {
                            sendEvent('complete', {
                                sessionId: capturedSessionId || sessionId || 'unknown',
                                type: 'error',
                                answer: 'I completed the task but could not generate a final response.'
                            });
                        }
                    }

                } catch (err: any) {
                    console.error('Streaming error:', err);
                    sendEvent('error', { message: err.message || 'An error occurred during streaming' });
                } finally {
                    controller.close();
                }
            },
            cancel() {
                // Handle cancellation if needed
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error: any) {
        console.error('Request handler error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
