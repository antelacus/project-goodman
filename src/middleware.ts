/**
 * Next.js Middleware for Security
 *
 * Centralized security checks applied to all requests:
 * - Rate limiting
 * - Request ID generation
 * - Security headers for rate limit info
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
    checkRateLimit,
    shouldBypassRateLimit,
    getRateLimitHeaders,
} from './lib/security/rate-limiter';
import { generateRequestId } from './lib/security/error-handler';

// =============================================================================
// Middleware
// =============================================================================

export async function middleware(request: NextRequest) {
    const requestId = generateRequestId();
    const pathname = request.nextUrl.pathname;
    const ip = getClientIP(request);

    // Skip non-API routes and static assets
    if (shouldSkipMiddleware(pathname)) {
        return NextResponse.next();
    }

    // Check if request should bypass rate limiting
    if (shouldBypassRateLimit(ip, pathname)) {
        const response = NextResponse.next();
        response.headers.set('X-Request-ID', requestId);
        return response;
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(ip, pathname);

    if (!rateLimitResult.allowed) {
        // Return 429 Too Many Requests
        return new NextResponse(
            JSON.stringify({
                error: '请求过于频繁，请稍后重试',
                requestId,
            }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-ID': requestId,
                    ...getRateLimitHeaders(rateLimitResult),
                },
            }
        );
    }

    // Allow request and add headers
    const response = NextResponse.next();
    response.headers.set('X-Request-ID', requestId);

    // Add rate limit headers
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
    for (const [key, value] of Object.entries(rateLimitHeaders)) {
        response.headers.set(key, value);
    }

    return response;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract client IP from request headers
 * Handles nginx proxy headers
 */
function getClientIP(request: NextRequest): string {
    // nginx sets x-forwarded-for when proxying
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        // Take the first IP (client IP) from the chain
        return forwarded.split(',')[0].trim();
    }

    // nginx can also set x-real-ip
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP.trim();
    }

    // Fallback for local development
    return '127.0.0.1';
}

/**
 * Check if middleware should skip this path
 */
function shouldSkipMiddleware(pathname: string): boolean {
    // Skip static assets
    if (pathname.startsWith('/_next')) {
        return true;
    }

    // Skip favicon
    if (pathname === '/favicon.ico') {
        return true;
    }

    // Skip public assets
    if (pathname.startsWith('/images') || pathname.startsWith('/fonts')) {
        return true;
    }

    // Only apply to API routes for now
    // This can be adjusted to apply to all routes if needed
    if (!pathname.startsWith('/api')) {
        return true;
    }

    return false;
}

// =============================================================================
// Matcher Configuration
// =============================================================================

export const config = {
    matcher: [
        /*
         * Match all API routes except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/api/:path*',
    ],
};
