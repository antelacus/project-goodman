/**
 * Landing Chat API Route
 *
 * Provides conversational AI guidance for the landing page.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { runLandingChatWorkflow } from "../../../lib/workflows/landing-chat";
import { validateRequest, LandingChatRequestSchema } from "../../../lib/validation/api-schemas";
import { generateRequestId, createErrorResponse } from "../../../lib/security/error-handler";

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    const body = await req.json();

    // Validate request with Zod schema
    const validation = validateRequest(LandingChatRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, requestId },
        { status: 413, headers: { 'X-Request-ID': requestId } }
      );
    }

    const { message, conversationHistory = [] } = validation.data;

    // Run workflow
    const state = await runLandingChatWorkflow({
      messages: conversationHistory,
      currentMessage: message,
    });

    // Return output
    return NextResponse.json(state.output);
  } catch (error: unknown) {
    console.error("Landing Chat API Error:", error);
    return createErrorResponse(error, requestId, 500);
  }
}

