export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import {
    generateRequestId,
    createErrorResponse,
    COOKIE_NAME,
    getCookieOptions,
    checkBruteForce,
    recordFailedAttempt,
    resetBruteForce,
    logAuthEvent,
    logSecurityEvent,
    setCsrfCookie,
} from "@/lib/security";
import { createAccountSession } from "@/lib/security/session";
import { authenticateUser } from "@/lib/auth";
import { validateRequest, LoginSchema } from "@/lib/validation/api-schemas";

/**
 * Helper to extract client IP from request
 */
function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || '127.0.0.1';
}

/**
 * POST /api/auth/login
 *
 * Authenticate an account with username and password; the session carries the account's role.
 * On success: creates Redis session and sets HTTP-only cookie.
 *
 * Security features:
 * - Brute-force protection (5 failures = 15min lockout)
 * - bcrypt password verification
 * - Redis-backed session storage
 * - HTTP-only, Secure, SameSite=Strict cookies
 */
export async function POST(req: NextRequest) {
    const requestId = req.headers.get('x-request-id') || generateRequestId();
    const clientIP = getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';

    try {
        // Step 1: Check brute-force protection
        const bruteCheck = await checkBruteForce(clientIP);

        if (!bruteCheck.allowed) {
            logSecurityEvent('lockout_active', clientIP, userAgent, {
                requestId,
                waitSeconds: bruteCheck.waitSeconds,
            });

            return NextResponse.json(
                {
                    success: false,
                    error: '账号已锁定，请稍后重试',
                    retryAfter: bruteCheck.waitSeconds,
                },
                {
                    status: 429,
                    headers: {
                        'X-Request-ID': requestId,
                        'Retry-After': String(bruteCheck.waitSeconds || 900),
                    },
                }
            );
        }

        // Step 2: Parse and validate request body
        const body = await req.json();
        const validation = validateRequest(LoginSchema, body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error },
                { status: 400, headers: { 'X-Request-ID': requestId } }
            );
        }

        const { username, password } = validation.data;

        // Add delay if brute-force protection suggests it
        const delaySeconds = bruteCheck.waitSeconds ?? 0;
        if (delaySeconds > 0) {
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }

        // Step 3: Authenticate against database
        const authResult = await authenticateUser({ username, password });

        if (!authResult.success || !authResult.user) {
            // Record failed attempt
            const failResult = await recordFailedAttempt(clientIP);

            if (failResult.locked) {
                logSecurityEvent('lockout_triggered', clientIP, userAgent, {
                    requestId,
                    username,
                    lockDuration: failResult.lockDuration,
                });

                return NextResponse.json(
                    {
                        success: false,
                        error: `密码错误次数过多，账号已锁定${Math.ceil(failResult.lockDuration! / 60)}分钟`,
                        retryAfter: failResult.lockDuration,
                    },
                    {
                        status: 429,
                        headers: {
                            'X-Request-ID': requestId,
                            'Retry-After': String(failResult.lockDuration),
                        },
                    }
                );
            }

            logAuthEvent('login_failed', clientIP, userAgent, { requestId, username });

            return NextResponse.json(
                { success: false, error: authResult.error || '用户名或密码错误' },
                { status: 401, headers: { 'X-Request-ID': requestId } }
            );
        }

        // Step 4: Create session and reset brute-force
        await resetBruteForce(clientIP);

        const session = await createAccountSession(clientIP, userAgent, {
            id: authResult.user.id,
            username: authResult.user.username,
            role: authResult.user.role,
            displayName: authResult.user.displayName,
        });

        logAuthEvent('login_success', clientIP, userAgent, {
            requestId,
            userId: authResult.user.id,
            username: authResult.user.username,
        });

        // Build response
        const response = NextResponse.json(
            {
                success: true,
                user: {
                    id: authResult.user.id,
                    username: authResult.user.username,
                    displayName: authResult.user.displayName,
                    role: authResult.user.role,
                },
                expiresAt: new Date(session.expiresAt).getTime(),
            },
            { status: 200 }
        );

        // Set HTTP-only session cookie
        response.cookies.set(COOKIE_NAME, session.token, getCookieOptions(session.role));

        // V3.9: Set CSRF cookie for authenticated requests
        await setCsrfCookie();

        response.headers.set('X-Request-ID', requestId);

        return response;
    } catch (error: unknown) {
        console.error('Login error:', error);
        return createErrorResponse(error, requestId, 500);
    }
}
