/**
 * API Route: /api/reports/parse-config
 *
 * Parse user's natural language response during report configuration.
 * Uses LLM to understand intent and extract year parameters.
 * v4.2: Conversational report configuration (PRD Section 3.5)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ensureSession,
  createErrorResponse,
} from '@/lib/security';
import { generateJSON, AIUnavailableError } from '@/lib/ai';
import { loadPromptWithVariables } from '@/lib/ai/prompts';
import {
  ReportConfigParseSchema,
  ReportConfigIntentSchema,
  validateRequest,
  type ReportConfigIntent,
} from '@/lib/validation/api-schemas';

export const runtime = 'nodejs';

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || `parse-config-${Date.now()}`;
  console.log('[parse-config] Request received:', requestId);

  try {
    // 1. Session validation - ensureSession creates guest session if needed
    // We don't need the session data for this endpoint, just need a valid session
    await ensureSession(req);
    console.log('[parse-config] Session validated');

    // 2. Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
      console.log('[parse-config] Body parsed:', JSON.stringify(body));
    } catch {
      console.error('[parse-config] JSON parse failed');
      return createErrorResponse('无效的请求格式', requestId, 400);
    }

    const validation = validateRequest(ReportConfigParseSchema, body);
    if (!validation.success) {
      console.error('[parse-config] Validation failed:', validation.error);
      return createErrorResponse(validation.error, requestId, 400);
    }

    const { userMessage, currentConfig, availableYears } = validation.data;

    // 3. Build prompt for LLM
    const sectionsDisplay = currentConfig.sections
      ? currentConfig.sections.join('、')
      : '全部（流动性、偿债能力、盈利能力、运营效率、综合评价）';

    const prompt = loadPromptWithVariables('report-config-intent.md', {
      year: currentConfig.year,
      comparisonYear: currentConfig.comparisonYear || '无',
      sections: sectionsDisplay,
      availableYears: availableYears.join('、'),
      userMessage,
    });

    // 4. Call LLM to parse intent
    let parsedIntent: ReportConfigIntent = await generateJSON({
      purpose: 'reportConfig',
      system: prompt,
      prompt: userMessage,
      schema: ReportConfigIntentSchema,
    });

    // 6. Validate year against available years if intent involves year change
    if (parsedIntent.intent === 'change_year' && parsedIntent.year) {
      if (!availableYears.includes(parsedIntent.year)) {
        // Year requested but not available
        parsedIntent = {
          intent: 'unclear',
          year: null,
          comparisonYear: null,
          sections: null,
          clarificationNeeded: `${parsedIntent.year} 年的财务数据暂不可用。可用年份：${availableYears.join('、')}`,
        };
      }
    }

    if (parsedIntent.intent === 'change_comparison' && parsedIntent.comparisonYear) {
      if (!availableYears.includes(parsedIntent.comparisonYear)) {
        // Comparison year requested but not available
        parsedIntent = {
          intent: 'unclear',
          year: null,
          comparisonYear: null,
          sections: null,
          clarificationNeeded: `${parsedIntent.comparisonYear} 年的财务数据暂不可用。可用年份：${availableYears.join('、')}`,
        };
      }
    }

    // 7. Validate sections if intent involves section change
    if (parsedIntent.intent === 'change_sections' && parsedIntent.sections) {
      if (parsedIntent.sections.length === 0) {
        parsedIntent = {
          intent: 'unclear',
          year: null,
          comparisonYear: null,
          sections: null,
          clarificationNeeded: '请至少选择一个分析章节。可选章节：流动性分析、偿债能力分析、盈利能力分析、运营效率分析、综合评价与建议',
        };
      }
    }

    // 8. Return parsed intent
    return NextResponse.json({
      success: true,
      data: parsedIntent,
    });
  } catch (error) {
    console.error('[parse-config] Error:', error);

    if (error instanceof AIUnavailableError) {
      return createErrorResponse('AI 服务暂时不可用，请稍后再试', requestId, 503);
    }

    return createErrorResponse(error, requestId, 500);
  }
}
