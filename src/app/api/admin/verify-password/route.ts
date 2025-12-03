export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminPassword,
  createAdminSession,
} from "../../../../lib/admin-auth";

/**
 * POST /api/admin/verify-password
 *
 * Verify admin password and create a session token if valid.
 *
 * Request Body:
 * {
 *   password: string;
 * }
 *
 * Response:
 * {
 *   valid: boolean;
 *   token?: string;        // Session token (Bearer token)
 *   expiresAt?: number;    // Unix timestamp when session expires
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { password } = body;

    // Validate input
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        {
          valid: false,
          error: 'Password is required'
        },
        { status: 400 }
      );
    }

    // Verify password
    const isValid = await verifyAdminPassword(password);

    if (!isValid) {
      // Return generic error message to prevent information disclosure
      return NextResponse.json(
        {
          valid: false,
        },
        { status: 200 } // Return 200 to avoid timing attacks
      );
    }

    // Create admin session
    const session = createAdminSession();

    // Return success with session token
    return NextResponse.json({
      valid: true,
      token: session.token,
      expiresAt: session.expiresAt,
    });

  } catch (error) {
    console.error('Admin password verification error:', error);

    // Return generic error to prevent information disclosure
    return NextResponse.json(
      {
        valid: false,
        error: 'Verification failed'
      },
      { status: 500 }
    );
  }
}
