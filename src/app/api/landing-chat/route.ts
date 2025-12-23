/**
 * Landing Chat API Route
 *
 * Handles initial user interaction, intent analysis, and module routing.
 * Now supports persistent memory via session ID.
 *
 * @route POST /api/landing-chat
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { runLandingChatWorkflowGraph } from "../../../lib/workflows/landing-chat/graph";
import { validateRequest, LandingChatRequestSchema } from "../../../lib/validation/api-schemas";
import { generateRequestId, createErrorResponse } from "../../../lib/security/error-handler";

/**
 * Main POST handler
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || generateRequestId();

  try {
    const body = await request.json();

    const validation = validateRequest(LandingChatRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, requestId },
        { status: 413, headers: { 'X-Request-ID': requestId } }
      );
    }

    const { messages, currentMessage, sessionId } = validation.data;

    const state = await runLandingChatWorkflowGraph({
      messages: messages ?? [],  // Ensure messages is always an array
      currentMessage,
      sessionId
    });

    return NextResponse.json({
      ...state.output,
      sessionId: state.sessionId
    });

  } catch (error: unknown) {
    console.error('Landing Chat API error:', error);
    return createErrorResponse(error, requestId, 500);
  }
}
