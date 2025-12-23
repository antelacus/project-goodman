/**
 * Financial Analysis API Route
 *
 * Calculates financial metrics using structured data and preset functions.
 * Uses OpenAI function calling to identify which preset function to use,
 * then queries the structured database and executes deterministic calculations.
 *
 * @route POST /api/financial-analysis
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { runFinancialAgentWorkflow } from "../../../lib/workflows/financial-analysis";
import { validateRequest, FinancialAnalysisRequestSchema } from "../../../lib/validation/api-schemas";
import { generateRequestId, createErrorResponse } from "../../../lib/security/error-handler";

/**
 * Main POST handler
 */
export async function POST(request: NextRequest) {
  // Get request ID from middleware (or generate one)
  const requestId = request.headers.get('x-request-id') || generateRequestId();

  try {
    const body = await request.json();

    // Validate request with Zod schema
    const validation = validateRequest(FinancialAnalysisRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, requestId },
        { status: 413, headers: { 'X-Request-ID': requestId } }
      );
    }

    const { question, year, period, documentIds, sessionId } = validation.data;

    // Use new workflow architecture
    const state = await runFinancialAgentWorkflow({
      question,
      year,
      period,
      documentIds,
      sessionId,
    });

    // Return workflow output with sessionId
    return NextResponse.json({
      ...state.output,
      sessionId: state.agent.sessionId
    });

  } catch (error: unknown) {
    console.error('Financial Analysis API error:', error);
    return createErrorResponse(error, requestId, 500);
  }
}
