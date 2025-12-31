export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminPassword,
  generateRequestId,
  createErrorResponse,
  createSession,
  COOKIE_NAME,
  COOKIE_OPTIONS,
  type SessionData,
  checkBruteForce,
  recordFailedAttempt,
  resetBruteForce,
  logAuthEvent,
  logSecurityEvent,
} from "@/lib/security";
import { validateRequest, AdminVerifyPasswordSchema } from "@/lib/validation/api-schemas";

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
      // Audit: Log lockout attempt
      logSecurityEvent('lockout_active', clientIP, userAgent, {
        requestId,
        waitSeconds: bruteCheck.waitSeconds,
      });

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

    // Validate with Zod schema (includes length limit)
    const validation = validateRequest(AdminVerifyPasswordSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { valid: false, error: validation.error, requestId },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    const { password } = validation.data;

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
        // Audit: Log lockout triggered
        logSecurityEvent('lockout_triggered', clientIP, userAgent, {
          requestId,
          lockDuration: failResult.lockDuration,
        });

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

      // Audit: Log failed login attempt
      logAuthEvent('login_failed', clientIP, userAgent, { requestId });

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

    // Audit: Log successful login (no sensitive data)
    logAuthEvent('login_success', clientIP, userAgent, {
      requestId,
      sessionCreated: true,
    });

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
