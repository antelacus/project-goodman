/**
 * API Route: /api/reports/parse-config
 *
 * Parse user's natural language response during report configuration.
 * Uses LLM to understand intent and extract year parameters.
 * v4.2: Conversational report configuration (PRD Section 3.5)
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  ensureSession,
  createErrorResponse,
} from '@/lib/security';
import {
  ReportConfigParseSchema,
  ReportConfigIntentSchema,
  validateRequest,
  type ReportConfigIntent,
} from '@/lib/validation/api-schemas';
import { getReportConfigIntentPrompt } from '@/lib/prompts';

export const runtime = 'nodejs';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || `parse-config-${Date.now()}`;

  try {
    // 1. Session validation - ensureSession creates guest session if needed
    // We don't need the session data for this endpoint, just need a valid session
    await ensureSession(req);

    // 2. Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse('无效的请求格式', requestId, 400);
    }

    const validation = validateRequest(ReportConfigParseSchema, body);
    if (!validation.success) {
      return createErrorResponse(validation.error, requestId, 400);
    }

    const { userMessage, currentConfig, availableYears } = validation.data;

    // 3. Build prompt for LLM
    const prompt = getReportConfigIntentPrompt(
      currentConfig.year,
      currentConfig.comparisonYear,
      availableYears,
      userMessage
    );

    // 4. Call LLM to parse intent
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cheap for simple intent parsing
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content?.trim();

    if (!responseContent) {
      // Fallback: treat as unclear
      return NextResponse.json({
        success: true,
        data: {
          intent: 'unclear',
          year: null,
          comparisonYear: null,
          clarificationNeeded: '抱歉，我没有理解您的意思，请重新描述。',
        } satisfies ReportConfigIntent,
      });
    }

    // 5. Parse LLM response
    let parsedIntent: ReportConfigIntent;
    try {
      const rawParsed = JSON.parse(responseContent);

      // Validate the parsed response
      const intentValidation = ReportConfigIntentSchema.safeParse(rawParsed);

      if (!intentValidation.success) {
        // If LLM response doesn't match schema, treat as unclear
        console.warn(
          '[parse-config] LLM response validation failed:',
          intentValidation.error.issues
        );
        parsedIntent = {
          intent: 'unclear',
          year: null,
          comparisonYear: null,
          clarificationNeeded: '抱歉，我没有理解您的意思，请重新描述。',
        };
      } else {
        parsedIntent = intentValidation.data;
      }
    } catch (parseError) {
      console.error('[parse-config] Failed to parse LLM JSON response:', parseError);
      parsedIntent = {
        intent: 'unclear',
        year: null,
        comparisonYear: null,
        clarificationNeeded: '抱歉，我没有理解您的意思，请重新描述。',
      };
    }

    // 6. Validate year against available years if intent involves year change
    if (parsedIntent.intent === 'change_year' && parsedIntent.year) {
      if (!availableYears.includes(parsedIntent.year)) {
        // Year requested but not available
        parsedIntent = {
          intent: 'unclear',
          year: null,
          comparisonYear: null,
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
          clarificationNeeded: `${parsedIntent.comparisonYear} 年的财务数据暂不可用。可用年份：${availableYears.join('、')}`,
        };
      }
    }

    // 7. Return parsed intent
    return NextResponse.json({
      success: true,
      data: parsedIntent,
    });
  } catch (error) {
    console.error('[parse-config] Error:', error);

    if (error instanceof Error && error.message.includes('API key')) {
      return createErrorResponse('AI 服务配置错误', requestId, 500);
    }

    return createErrorResponse(error, requestId, 500);
  }
}
