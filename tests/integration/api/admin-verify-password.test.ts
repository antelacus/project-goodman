/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/verify-password/route';
import * as logging from '@/lib/logging';
import * as security from '@/lib/security';
import * as validation from '@/lib/validation/api-schemas';

vi.mock('@/lib/logging', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logRequest: vi.fn(),
  logError: vi.fn(),
  logWorkflowEvent: vi.fn(),
}));

vi.mock('@/lib/security', () => ({
  verifyAdminPassword: vi.fn(),
  generateRequestId: () => 'req-1',
  createErrorResponse: (error: unknown, requestId: string, status = 500) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, requestId }),
      { status, headers: { 'content-type': 'application/json' } }
    );
  },
  createSession: vi.fn(),
  COOKIE_NAME: 'session',
  COOKIE_OPTIONS: { httpOnly: true, secure: true, sameSite: 'strict', path: '/' },
  checkBruteForce: vi.fn(),
  recordFailedAttempt: vi.fn(),
  resetBruteForce: vi.fn(),
  logAuthEvent: vi.fn(),
  logSecurityEvent: vi.fn(),
}));

vi.mock('@/lib/validation/api-schemas', () => ({
  AdminVerifyPasswordSchema: {},
  validateRequest: vi.fn(),
}));

function createRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/verify-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(security.checkBruteForce).mockResolvedValue({ allowed: true });
  vi.mocked(validation.validateRequest).mockReturnValue({
    success: false,
    error: 'invalid payload',
  });
});

describe('POST /api/admin/verify-password', () => {
  it('logs workflow failure on validation errors', async () => {
    const response = await POST(createRequest({}));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.valid).toBe(false);

    expect(vi.mocked(logging.logWorkflowEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: 'admin_auth',
        step: 'start',
        status: 'ok',
        requestId: 'req-1',
      })
    );
    expect(vi.mocked(logging.logWorkflowEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: 'admin_auth',
        step: 'failure',
        status: 'error',
        errorType: 'VALIDATION',
        requestId: 'req-1',
      })
    );
  });
});
