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
import { runFinancialAnalysisWorkflow } from "../../../lib/workflows/financial-analysis";

/**
 * Environment variable to toggle between new workflow and legacy implementation
 * Set USE_WORKFLOW_ENGINE=true to use the new workflow architecture
 */
const USE_WORKFLOW_ENGINE = process.env.USE_WORKFLOW_ENGINE === 'true';

/**
 * Main POST handler
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, year, period, documentIds } = body;

    // Validate request
    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: '问题不能为空' },
        { status: 400 }
      );
    }

    // Use new workflow architecture
    const state = await runFinancialAnalysisWorkflow({
      question,
      year,
      period,
      documentIds,
    });

    // Return workflow output
    return NextResponse.json(state.output);

  } catch (error: any) {
    console.error('Financial Analysis API error:', error);
    return NextResponse.json(
      {
        error: '处理财务分析请求时发生错误',
        details: error.message
      },
      { status: 500 }
    );
  }
}
