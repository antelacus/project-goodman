export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminPassword,
  createAdminSession,
} from "../../../../lib/admin-auth";
import { generateRequestId, createErrorResponse } from "../../../../lib/security/error-handler";

/**
 * POST /api/admin/verify-password
 *
 * Verify admin password and create a session token if valid.
 */
export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    // Parse request body
    const body = await req.json();
    const { password } = body;

    // Validate input
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Password is required', requestId },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Verify password
    const isValid = await verifyAdminPassword(password);

    if (!isValid) {
      // Return generic error message to prevent information disclosure
      return NextResponse.json(
        { valid: false, requestId },
        { status: 200, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Create admin session
    const session = createAdminSession();

    // Return success with session token
    return NextResponse.json({
      valid: true,
      token: session.token,
      expiresAt: session.expiresAt,
      requestId,
    });

  } catch (error: unknown) {
    console.error('Admin password verification error:', error);
    return createErrorResponse(error, requestId, 500);
  }
}

