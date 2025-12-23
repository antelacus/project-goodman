/**
 * Guidance Chat API Route
 *
 * Provides legal and compliance guidance based on regulations and uploaded documents.
 * Uses hybrid search (vector + keyword) and structured reasoning.
 *
 * @route POST /api/guidance-chat
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { runGuidanceChatWorkflow } from "../../../lib/workflows/guidance-chat";
import { validateRequest, GuidanceChatRequestSchema } from "../../../lib/validation/api-schemas";
import { generateRequestId, createErrorResponse } from "../../../lib/security/error-handler";

/**
 * Main POST handler
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || generateRequestId();

  try {
    const body = await request.json();

    const validation = validateRequest(GuidanceChatRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, requestId },
        { status: 413, headers: { 'X-Request-ID': requestId } }
      );
    }

    const { question, uploadedDocument, documentIds, regulationCategories, autoSelect, sessionId } = validation.data;

    const state = await runGuidanceChatWorkflow({
      question,
      uploadedDocument,
      documentIds,
      regulationCategories,
      // Ensure autoSelect has required 'enabled' field when present
      autoSelect: autoSelect ? { enabled: autoSelect.enabled ?? true, maxDocuments: autoSelect.maxDocuments } : undefined,
      sessionId
    });

    return NextResponse.json({
      ...state.output,
      sessionId: state.sessionId // Return session ID
    });

  } catch (error: unknown) {
    console.error('Guidance Chat API error:', error);
    return createErrorResponse(error, requestId, 500);
  }
}
