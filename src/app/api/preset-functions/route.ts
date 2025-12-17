/**
 * API Endpoint: GET /api/preset-functions
 *
 * Returns a list of all available preset financial calculation functions.
 * These functions are used by the Financial Analysis module to perform
 * standardized calculations on financial data.
 *
 * Response format matches Phase 2 design specification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { presetFunctions } from '../../../lib/preset-functions';
import { generateRequestId, createErrorResponse } from '../../../lib/security/error-handler';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || generateRequestId();

  try {
    // Transform preset functions into API response format
    const functions = presetFunctions.map((func) => ({
      id: func.name,                    // Use name as ID for consistency
      name: func.name,
      displayName: func.displayName,
      displayNameEn: func.displayNameEn,
      category: func.category,
      description: func.interpretation,  // Use interpretation as description
      requiredInputs: func.requiredInputs,
      unit: func.unit,
      formula: func.formula,
      formulaDisplay: func.formulaDisplay,
    }));

    return NextResponse.json({
      functions,
      total: functions.length,
      categories: {
        liquidity: functions.filter(f => f.category === 'liquidity').length,
        solvency: functions.filter(f => f.category === 'solvency').length,
        profitability: functions.filter(f => f.category === 'profitability').length,
        efficiency: functions.filter(f => f.category === 'efficiency').length,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching preset functions:', error);
    return createErrorResponse(error, requestId, 500);
  }
}
