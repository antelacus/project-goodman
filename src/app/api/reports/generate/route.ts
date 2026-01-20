/**
 * API Route: /api/reports/generate
 *
 * Generate a financial analysis report via SSE streaming.
 * v4.2: Report generation workflow with real-time progress updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { reportWorkflowGraph, createInitialState } from '@/lib/workflows/report';
import {
  ensureSession,
  checkGuestRate,
  incrementGuestRate,
  generateRequestId,
  createErrorResponse,
} from '@/lib/security';
import { logger, logRequest, logError } from '@/lib/logging';
import { ReportGenerateSchema, validateRequest } from '@/lib/validation/api-schemas';
import { withSentrySpan } from '@/lib/observability/error-tracking';
import { isPerfTestRequest } from '@/lib/quality-gates/perf-test';
import type {
  ReportPhaseEvent,
  ReportSectionEvent,
  ReportCompleteEvent,
  ReportErrorEvent,
  ReportProcessEvent,
  ReportPhase,
} from '@/types/report-events';

export const runtime = 'nodejs';

// ============================================================================
// Phase Mapping
// ============================================================================

/**
 * Map node names to report phases
 */
function nodeToPhase(nodeName: string): ReportPhase | null {
  switch (nodeName) {
    case 'checkDataAvailability':
      return 'check';
    case 'gatherMetrics':
    case 'gatherContext':
      return 'gather';
    case 'analyzeSections':
      return 'analyze';
    case 'assembleReport':
      return 'generate';
    default:
      return null;
  }
}

// ============================================================================
// SSE Event Helpers
// ============================================================================

function createPhaseEvent(
  phase: ReportPhase,
  status: 'started' | 'completed'
): ReportPhaseEvent {
  return {
    type: 'phase',
    data: { phase, status },
  };
}

function createSectionEvent(
  sectionId: string,
  status: 'generating' | 'completed',
  content?: unknown
): ReportSectionEvent {
  return {
    type: 'section',
    data: {
      sectionId,
      status,
      ...(content ? { content: content as ReportSectionEvent['data']['content'] } : {}),
    },
  };
}

function createCompleteEvent(
  reportId: string,
  content: unknown,
  generationTimeMs?: number
): ReportCompleteEvent {
  return {
    type: 'complete',
    data: {
      reportId,
      content: content as ReportCompleteEvent['data']['content'],
      generationTimeMs,
    },
  };
}

function createErrorEvent(
  message: string,
  phase?: ReportPhase
): ReportErrorEvent {
  return {
    type: 'error',
    data: {
      message,
      phase,
      recoverable: false,
    },
  };
}

function createProcessEvent(
  eventType: 'tool_call' | 'tool_result',
  toolName?: string,
  result?: string
): ReportProcessEvent {
  return {
    type: 'process',
    data: { eventType, toolName, result },
  };
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  const spanContext = {
    name: 'api.reports.generate',
    op: 'http.server',
    attributes: {
      'http.route': '/api/reports/generate',
      'http.method': 'POST',
    },
  };

  return withSentrySpan(spanContext, async () => {
    if (isPerfTestRequest(req)) {
      await req.arrayBuffer();
      return NextResponse.json({ success: true, perfTest: true });
    }

    const requestId = req.headers.get('x-request-id') || generateRequestId();
    const startTime = Date.now();

    logger.info('Report generation started', { requestId, route: '/api/reports/generate' });

    try {
      // Ensure session exists (creates guest session if needed)
      const sessionResult = await ensureSession(req);
      const { session, isNewSession } = sessionResult;

      // Check rate limit for guest users
      if (session.role === 'guest') {
        const rateCheck = await checkGuestRate(session.sessionId, 'report');
        if (!rateCheck.allowed) {
          const response = NextResponse.json(
            {
              error: '已达到报告生成限制，请1小时后重试',
              resetsAt: rateCheck.resetsAt,
              remaining: rateCheck.remaining,
              total: rateCheck.total,
            },
            { status: 429 }
          );

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

      // Validate request
      const validation = validateRequest(ReportGenerateSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      const { year, comparisonYear } = validation.data;

      // Increment rate limit for guest after validation
      if (session.role === 'guest') {
        await incrementGuestRate(session.sessionId, 'report');
      }

      // Determine owner info
      const ownerId = session.userId || session.sessionId;
      const ownerType = session.role;

      // Generate a temporary report ID (will be used if saved)
      const tempReportId = uuidv4();

      // Create initial state for workflow
      const initialState = createInitialState({
        year,
        comparisonYear,
        ownerId,
        ownerType,
      });

      // Create SSE stream
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (eventType: string, data: unknown) => {
            const formattedData = JSON.stringify(data);
            controller.enqueue(`event: ${eventType}\ndata: ${formattedData}\n\n`);
          };

          // Track which phases we've already started/completed
          const phasesSent = new Map<string, Set<string>>();
          let currentPhase: ReportPhase | null = null;

          try {
            // Stream events from the workflow
            const eventStream = await reportWorkflowGraph.streamEvents(
              initialState,
              { version: 'v2' }
            );

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let finalState: any = null;

            for await (const event of eventStream) {
              // Filter internal LangGraph events
              const isInternalEvent = (name: string) => {
                return !name ||
                  name === 'LangGraph' ||
                  name === '__start__' ||
                  name.startsWith('Runnable') ||
                  name.startsWith('ChannelWrite') ||
                  name.startsWith('ChannelRead') ||
                  name.startsWith('Branch<') ||
                  name.includes(':');
              };

              // Node started - send phase start event
              if (event.event === 'on_chain_start' && event.name && !isInternalEvent(event.name)) {
                const phase = nodeToPhase(event.name);
                if (phase) {
                  if (!phasesSent.has(phase)) {
                    phasesSent.set(phase, new Set());
                  }
                  if (!phasesSent.get(phase)!.has('started')) {
                    sendEvent('report', createPhaseEvent(phase, 'started'));
                    phasesSent.get(phase)!.add('started');
                    currentPhase = phase;
                  }
                }
              }

              // Node completed - send phase complete event
              if (event.event === 'on_chain_end' && event.name && !isInternalEvent(event.name)) {
                const phase = nodeToPhase(event.name);
                if (phase && phasesSent.has(phase) && !phasesSent.get(phase)!.has('completed')) {
                  // For analyzeSections, send section events before marking phase complete
                  if (event.name === 'analyzeSections' && event.data?.output?.sections) {
                    const sections = event.data.output.sections;
                    for (const section of sections) {
                      if (section.result) {
                        sendEvent('report', createSectionEvent(section.id, 'completed', section.result));
                      }
                    }
                  }
                  sendEvent('report', createPhaseEvent(phase, 'completed'));
                  phasesSent.get(phase)!.add('completed');
                }

                // Capture final state from assembleReport
                if (event.name === 'assembleReport' && event.data?.output?.report) {
                  finalState = event.data.output;
                }
              }

              // Capture final state from LangGraph end
              if (event.event === 'on_chain_end' && event.name === 'LangGraph') {
                if (event.data?.output) {
                  finalState = event.data.output;
                }
              }

              // Tool events (optional - for detailed progress)
              if (event.event === 'on_tool_start' && event.name) {
                sendEvent('report', createProcessEvent('tool_call', event.name));
              }

              if (event.event === 'on_tool_end' && event.name) {
                const output = event.data?.output;
                let result: string | undefined;
                if (output && typeof output === 'object' && 'formatted' in output) {
                  result = String((output as { formatted: unknown }).formatted);
                }
                sendEvent('report', createProcessEvent('tool_result', event.name, result));
              }
            }

            // Send complete event with report content
            if (finalState?.report) {
              sendEvent(
                'report',
                createCompleteEvent(
                  tempReportId,
                  finalState.report,
                  finalState.meta?.generationTimeMs
                )
              );
            } else if (finalState?.meta?.error) {
              sendEvent('report', createErrorEvent(
                finalState.meta.error.message || '报告生成失败',
                currentPhase || undefined
              ));
            } else if (finalState?.dataAvailability?.error) {
              sendEvent('report', createErrorEvent(
                finalState.dataAvailability.error,
                'check'
              ));
            } else {
              sendEvent('report', createErrorEvent('报告生成失败：未知错误'));
            }

          } catch (err: unknown) {
            logError('Report generation stream error', err, requestId, { route: '/api/reports/generate' });
            const errorMessage = err instanceof Error ? err.message : '报告生成过程中发生错误';
            sendEvent('report', createErrorEvent(errorMessage, currentPhase || undefined));
          } finally {
            controller.close();
          }
        },
        cancel() {
          // Handle cancellation if needed
        },
      });

      // Build response headers
      const headers: HeadersInit = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      };

      // Add session cookie for new guest sessions
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

      logRequest(requestId, 'POST', '/api/reports/generate', 200, Date.now() - startTime);
      return new Response(stream, { headers });

    } catch (error: unknown) {
      logError('Report generation request failed', error, requestId, { route: '/api/reports/generate' });
      logRequest(requestId, 'POST', '/api/reports/generate', 500, Date.now() - startTime);
      return createErrorResponse(error, requestId, 500);
    }
  });
}
