/**
 * CSRF Token Endpoint
 *
 * GET /api/auth/csrf
 *
 * Returns a CSRF token for use in subsequent state-changing requests.
 * The token is also set as an HttpOnly cookie for Double Submit validation.
 */

import { NextResponse } from 'next/server';
import {
    setCsrfCookie,
    generateRequestId,
    createErrorResponse,
} from '@/lib/security';

export async function GET() {
    const requestId = generateRequestId();

    try {
        // Generate and set CSRF cookie, return token to client
        const token = await setCsrfCookie();

        return NextResponse.json({
            success: true,
            token,
        });
    } catch (error) {
        console.error('[CSRF] Failed to generate token:', error);
        return createErrorResponse(error, requestId, 500);
    }
}
