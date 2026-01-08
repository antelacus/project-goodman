import { NextRequest, NextResponse } from 'next/server';
import { unifiedAgentGraph } from '@/lib/workflows/unified/graph';
import {
    ensureSession,
    checkGuestRate,
    incrementGuestRate,
    getCookieOptions,
    COOKIE_NAME,
    generateRequestId,
    createErrorResponse,
} from '@/lib/security';
import { ChatMessageSchema, validateRequest } from '@/lib/validation/api-schemas';
import { v4 as uuidv4 } from 'uuid';
import {
    formatToolCallEvent,
    formatToolResultEvent,
    formatThinkingEvent,
} from '@/lib/workflows/shared/format-event';
import type { ProcessEvent, SourceReference } from '@/types/process-events';

export const runtime = 'nodejs'; // Ensure Node.js runtime for LangGraph

// ============================================================================
// v4.0: Process Event Helpers
// ============================================================================

/**
 * Extract source reference from tool output if available.
 * Source is constructed by tool code from database metadata, not LLM-generated.
 */
function extractSourceReference(output: unknown): SourceReference | undefined {
    if (!output || typeof output !== 'object') return undefined;

    const data = output as Record<string, unknown>;

    // Check for source field in output.data (standard tool output structure)
    if (data.data && typeof data.data === 'object') {
        const innerData = data.data as Record<string, unknown>;
        if (innerData.source && typeof innerData.source === 'object') {
            const source = innerData.source as Record<string, unknown>;
            return buildSourceReference(source);
        }
        // Check for sourceDocuments array (preset tools format)
        if (innerData.sourceDocuments && Array.isArray(innerData.sourceDocuments)) {
            const docName = innerData.sourceDocuments[0];
            if (docName) {
                return {
                    documentId: '',
                    documentName: String(docName),
                    documentType: '',
                };
            }
        }
    }

    // Direct source field (alternative structure)
    if (data.source && typeof data.source === 'object') {
        return buildSourceReference(data.source as Record<string, unknown>);
    }

    return undefined;
}

function buildSourceReference(source: Record<string, unknown>): SourceReference {
    return {
        documentId: String(source.documentId || source.document_id || ''),
        documentName: String(source.documentName || source.document_name || ''),
        documentType: String(source.documentType || source.document_type || ''),
        year: source.year ? String(source.year) : undefined,
        period: source.period ? String(source.period) : undefined,
        fileUrl: source.fileUrl ? String(source.fileUrl) : undefined,
    };
}

/**
 * Create a ProcessEvent object
 */
function createProcessEvent(
    type: ProcessEvent['type'],
    content: string,
    details?: Record<string, unknown>,
    sourceReference?: SourceReference
): ProcessEvent {
    return {
        id: uuidv4(),
        timestamp: Date.now(),
        type,
        content,
        details,
        sourceReference,
    };
}

export async function POST(req: NextRequest) {
    const requestId = req.headers.get('x-request-id') || generateRequestId();

    try {
        // V3.10: Ensure session exists (creates guest session if needed)
        const sessionResult = await ensureSession(req);
        const { session, isNewSession } = sessionResult;

        // V3.10: Check rate limit for guest users
        if (session.role === 'guest') {
            const rateCheck = await checkGuestRate(session.sessionId, 'message');
            if (!rateCheck.allowed) {
                const response = NextResponse.json(
                    {
                        error: '已达到消息数量限制，请1小时后重试',
                        resetsAt: rateCheck.resetsAt,
                        remaining: rateCheck.remaining,
                        total: rateCheck.total,
                    },
                    { status: 429 }
                );

                // Set cookie for new sessions even on rate limit error
                if (isNewSession && sessionResult.setCookieHeader) {
                    response.cookies.set(
                        sessionResult.setCookieHeader.name,
                        sessionResult.setCookieHeader.value,
                        sessionResult.setCookieHeader.options
                    );
                }

                return response;
            }
        }

        const body = await req.json();

        // V3.9: Validate request with Zod schema
        const validation = validateRequest(ChatMessageSchema, body);
        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error },
                { status: 400 }
            );
        }

        const { question, sessionId, files, documentIds } = validation.data;

        // V3.10: Increment rate limit for guest after validation passes
        if (session.role === 'guest') {
            await incrementGuestRate(session.sessionId, 'message');
        }

        // Don't generate UUID here - let loadMemoryNode create/load the session
        // This ensures sessionId consistency between what's stored and what's returned

        // V3.10+: Determine owner info for session tracking
        // For admin/user: use userId as owner
        // For guest: use auth sessionId as owner
        const ownerId = session.userId || session.sessionId;
        const ownerType = session.role;

        // Initialize state
        // We cast to any to avoid strict type checking on DeepPartial,
        // but the structure matches UnifiedAgentState.
        const initialState: any = {
            input: {
                question,
                sessionId: sessionId, // Pass as-is (can be undefined), loadMemoryNode will handle
                files: files || [],
                documentIds: documentIds || [],
                workflowType: 'unified',
                ownerId,
                ownerType,
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

                        // 1. Thinking: when a node starts (excluding internal LangGraph events)
                        // Filter out: LangGraph, Runnable*, ChannelWrite*, Branch*, __start__
                        const isInternalEvent = (name: string) => {
                            return !name ||
                                name === 'LangGraph' ||
                                name === '__start__' ||
                                name.startsWith('Runnable') ||
                                name.startsWith('ChannelWrite') ||
                                name.startsWith('ChannelRead') ||
                                name.startsWith('Branch<') ||
                                name.includes(':');  // e.g., "branch:to:loadMemory"
                        };

                        if (event.event === 'on_chain_start' && event.name && !isInternalEvent(event.name)) {
                            sendEvent('thinking', { node: event.name });

                            // v4.0: Send humanized process event
                            const humanized = formatThinkingEvent(event.name);
                            sendEvent('process', createProcessEvent(
                                'thinking',
                                humanized,
                                { node: event.name }
                            ));
                        }

                        // 2. Tool Call: when the agent decides to call a tool
                        else if (event.event === 'on_tool_start') {
                            sendEvent('tool_call', { tool: event.name, input: event.data.input });

                            // v4.0: Send humanized process event
                            const humanized = formatToolCallEvent(
                                event.name,
                                event.data.input as Record<string, unknown>
                            );
                            sendEvent('process', createProcessEvent(
                                'tool_call',
                                humanized,
                                { tool: event.name, input: event.data.input }
                            ));
                        }

                        // 3. Tool Result: when a tool execution finishes
                        else if (event.event === 'on_tool_end') {
                            sendEvent('tool_result', { tool: event.name, output: event.data.output });

                            // v4.0: Send humanized process event with source reference
                            const humanized = formatToolResultEvent(
                                event.name,
                                event.data.output as Record<string, unknown>
                            );
                            const sourceRef = extractSourceReference(event.data.output);
                            sendEvent('process', createProcessEvent(
                                'tool_result',
                                humanized,
                                { tool: event.name, output: event.data.output },
                                sourceRef
                            ));
                        }

                        // 4. Capture tool calls from agentLoop node (when LLM decides to use tools)
                        else if (event.event === 'on_chain_end' && event.name === 'agentLoop') {
                            const pendingToolCalls = event.data?.output?.agent?.pendingToolCalls;
                            if (Array.isArray(pendingToolCalls) && pendingToolCalls.length > 0) {
                                for (const toolCall of pendingToolCalls) {
                                    if (!toolCall.name) continue;

                                    // Emit tool_call process event
                                    const humanized = formatToolCallEvent(
                                        toolCall.name,
                                        toolCall.arguments || {}
                                    );
                                    sendEvent('process', createProcessEvent(
                                        'tool_call',
                                        humanized,
                                        { tool: toolCall.name, input: toolCall.arguments }
                                    ));
                                }
                            }
                        }

                        // 5. Capture tool results from toolExecutor node
                        // Results include success/failure, data, and source information
                        else if (event.event === 'on_chain_end' && event.name === 'toolExecutor') {
                            const toolResults = event.data?.output?.toolResults;
                            if (Array.isArray(toolResults) && toolResults.length > 0) {
                                for (const resultEntry of toolResults) {
                                    if (!resultEntry.toolName) continue;

                                    const result = resultEntry.result || {};

                                    // Check if tool execution failed
                                    if (result.success === false) {
                                        // Emit error process event for failed tool
                                        const errorHumanized = formatToolResultEvent(
                                            resultEntry.toolName,
                                            result
                                        );
                                        sendEvent('process', createProcessEvent(
                                            'error',
                                            errorHumanized,
                                            { tool: resultEntry.toolName, error: result.error }
                                        ));
                                    } else {
                                        // Emit tool_result process event for successful tool
                                        const humanized = formatToolResultEvent(
                                            resultEntry.toolName,
                                            result
                                        );
                                        const sourceRef = extractSourceReference(result);
                                        sendEvent('process', createProcessEvent(
                                            'tool_result',
                                            humanized,
                                            { tool: resultEntry.toolName, output: result },
                                            sourceRef
                                        ));
                                    }
                                }
                            }
                        }

                        // 6. Capture sessionId from loadMemory node (this is the authoritative session ID)
                        else if (event.event === 'on_chain_end' && event.name === 'loadMemory') {
                            if (event.data?.output?.agent?.sessionId) {
                                capturedSessionId = event.data.output.agent.sessionId;
                            }
                        }

                        // 7. Capture Final Output: Look for the end of the main graph execution
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
                    const errorMessage = err.message || 'An error occurred during streaming';
                    sendEvent('error', { message: errorMessage });

                    // v4.0: Send process error event (no stack trace to prevent info disclosure)
                    sendEvent('process', createProcessEvent(
                        'error',
                        `错误: ${errorMessage}`,
                        { error: errorMessage }
                    ));
                } finally {
                    controller.close();
                }
            },
            cancel() {
                // Handle cancellation if needed
            }
        });

        // Build response headers
        const headers: HeadersInit = {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        };

        // V3.10: Add session cookie for new guest sessions
        if (isNewSession && sessionResult.setCookieHeader) {
            const { name, value, options } = sessionResult.setCookieHeader;
            const cookieParts = [
                `${name}=${value}`,
                `Path=${options.path}`,
                `Max-Age=${options.maxAge}`,
                options.httpOnly ? 'HttpOnly' : '',
                options.secure ? 'Secure' : '',
                `SameSite=${options.sameSite}`,
            ].filter(Boolean);

            headers['Set-Cookie'] = cookieParts.join('; ');
        }

        return new Response(stream, { headers });
    } catch (error: unknown) {
        console.error('Request handler error:', error);
        return createErrorResponse(error, requestId, 500);
    }
}
