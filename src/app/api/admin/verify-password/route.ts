export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPassword } from "../../../../lib/admin-auth";
import { generateRequestId, createErrorResponse } from "../../../../lib/security/error-handler";
import { createSession, COOKIE_NAME, COOKIE_OPTIONS, SessionData } from "../../../../lib/security/session";
import { checkBruteForce, recordFailedAttempt, resetBruteForce } from "../../../../lib/security/brute-force";

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
 * POST /api/admin/verify-password
 *
 * Verify admin password with brute-force protection.
 * On success: creates Redis session and sets HTTP-only cookie.
 *
 * Security features:
 * - Brute-force protection (3 failures = delay, 5 failures = 15min lockout)
 * - bcrypt password verification (with plaintext migration)
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
      return NextResponse.json(
        {
          valid: false,
          error: '账号已锁定，请稍后重试',
          waitSeconds: bruteCheck.waitSeconds,
          requestId,
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
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { valid: false, error: '密码不能为空', requestId },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Add delay if brute-force protection suggests it (after 3 failures)
    const delaySeconds = bruteCheck.waitSeconds ?? 0;
    if (delaySeconds > 0) {
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }

    // Step 3: Verify password
    const verifyResult = await verifyAdminPassword(password);

    if (!verifyResult.valid) {
      // Record failed attempt
      const failResult = await recordFailedAttempt(clientIP);

      if (failResult.locked) {
        return NextResponse.json(
          {
            valid: false,
            error: `密码错误次数过多，账号已锁定${Math.ceil(failResult.lockDuration! / 60)}分钟`,
            waitSeconds: failResult.lockDuration,
            requestId,
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

      // Return generic error (don't reveal if password exists)
      return NextResponse.json(
        { valid: false, requestId },
        { status: 200, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Step 4: Password valid - create session and reset brute-force
    await resetBruteForce(clientIP);

    // Create Redis-backed session
    const session: SessionData = await createSession(clientIP, userAgent);

    // Build response with session cookie
    const response = NextResponse.json(
      {
        valid: true,
        expiresAt: new Date(session.expiresAt).getTime(),
        requestId,
      },
      { status: 200 }
    );

    // Set HTTP-only cookie
    response.cookies.set(COOKIE_NAME, session.token, COOKIE_OPTIONS);
    response.headers.set('X-Request-ID', requestId);

    return response;
  } catch (error: unknown) {
    console.error('Admin password verification error:', error);
    return createErrorResponse(error, requestId, 500);
  }
}
