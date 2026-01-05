/**
 * CSRF Protection using Double Submit Cookie Pattern
 *
 * Double Submit Cookie works by:
 * 1. Setting a CSRF token in an HttpOnly cookie
 * 2. Client must also send the same token in a request header
 * 3. Server validates both match
 *
 * This is secure because:
 * - Attackers cannot read HttpOnly cookies via JavaScript
 * - Attackers cannot set custom headers in cross-origin requests
 * - Both values must match for the request to be valid
 */

import { cookies } from 'next/headers';
import { randomBytes, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

// =============================================================================
// Constants
// =============================================================================

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32; // 256 bits
const CSRF_TOKEN_TTL = 24 * 60 * 60; // 24 hours in seconds

// =============================================================================
// Token Generation
// =============================================================================

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
    return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

// =============================================================================
// Cookie Management
// =============================================================================

/**
 * Set CSRF token cookie (call after session creation)
 * Returns the token so client can include it in requests
 */
export async function setCsrfCookie(): Promise<string> {
    const token = generateCsrfToken();
    const cookieStore = await cookies();

    cookieStore.set(CSRF_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: CSRF_TOKEN_TTL,
    });

    return token;
}

/**
 * Get CSRF token from cookie
 */
export async function getCsrfTokenFromCookie(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(CSRF_COOKIE_NAME)?.value ?? null;
}

/**
 * Get CSRF token from request header
 */
export function getCsrfTokenFromHeader(request: NextRequest | Request): string | null {
    return request.headers.get(CSRF_HEADER_NAME);
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Constant-time comparison of two tokens
 * Prevents timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        // Perform a dummy comparison to prevent timing leaks on length
        const dummy = Buffer.alloc(CSRF_TOKEN_LENGTH * 2);
        timingSafeEqual(dummy, dummy);
        return false;
    }

    try {
        return timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
        return false;
    }
}

/**
 * Validate CSRF token from request
 * Compares cookie token with header token using constant-time comparison
 *
 * @param request - The incoming request
 * @returns true if CSRF validation passes
 */
export async function validateCsrf(request: NextRequest | Request): Promise<boolean> {
    const cookieToken = await getCsrfTokenFromCookie();
    const headerToken = getCsrfTokenFromHeader(request);

    // Both tokens must exist
    if (!cookieToken || !headerToken) {
        return false;
    }

    // Tokens must match (using constant-time comparison)
    return constantTimeCompare(cookieToken, headerToken);
}

// =============================================================================
// Middleware Helper
// =============================================================================

/**
 * Check if a request method requires CSRF protection
 * GET, HEAD, OPTIONS are safe methods and don't need CSRF
 */
export function requiresCsrfProtection(method: string): boolean {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    return !safeMethods.includes(method.toUpperCase());
}

/**
 * Create CSRF validation error response
 */
export function createCsrfErrorResponse(): Response {
    return new Response(
        JSON.stringify({
            error: 'CSRF validation failed',
            message: 'Missing or invalid CSRF token. Please refresh the page and try again.',
        }),
        {
            status: 403,
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );
}
