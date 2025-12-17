/**
 * Guidance Chat API Route
 *
 * Provides regulatory compliance guidance using hybrid search.
 * This route has been refactored to use the workflow architecture.
 */

import { NextRequest, NextResponse } from "next/server";
import { runGuidanceChatWorkflow } from "../../../lib/workflows/guidance-chat";
import { validateRequest, GuidanceChatRequestSchema } from "../../../lib/validation/api-schemas";
import { generateRequestId, createErrorResponse } from "../../../lib/security/error-handler";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || generateRequestId();

  try {
    const body = await request.json();

    // Validate request with Zod schema
    const validation = validateRequest(GuidanceChatRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, requestId },
        { status: 413, headers: { 'X-Request-ID': requestId } }
      );
    }

    const { question, uploadedDocument, documentIds, regulationCategories } = validation.data;

    // Run workflow
    const state = await runGuidanceChatWorkflow({
      question,
      uploadedDocument,
      documentIds,
      regulationCategories,
    });

    // Return output
    return NextResponse.json(state.output);
  } catch (error: unknown) {
    console.error("Guidance Chat API error:", error);
    return createErrorResponse(error, requestId, 500);
  }
}

