// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/observability/error-tracking', () => ({
  captureError: vi.fn(),
}));

import { createErrorResponse } from '@/lib/security/error-handler';
import { captureError } from '@/lib/observability/error-tracking';

describe('createErrorResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports server errors with requestId', async () => {
    createErrorResponse(new Error('boom'), 'req_test', 500);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(captureError).toHaveBeenCalledWith(expect.any(Error), {
      requestId: 'req_test',
      route: undefined,
    });
  });

  it('does not report client errors', () => {
    createErrorResponse(new Error('bad'), 'req_test', 400);
    expect(captureError).not.toHaveBeenCalled();
  });
});
