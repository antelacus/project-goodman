/* @vitest-environment node */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { postWithCsrf } from '@/lib/security/csrf-client';

function mockJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('postWithCsrf', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds csrf header from token endpoint', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({ success: true, token: 'csrf-token' }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    await postWithCsrf('/api/auth/logout');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/csrf');

    const [, requestInit] = fetchMock.mock.calls[1];
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/logout', expect.any(Object));
    expect(requestInit?.method).toBe('POST');

    const headers = requestInit?.headers as Headers;
    expect(headers.get('x-csrf-token')).toBe('csrf-token');
  });

  it('throws when csrf token is unavailable', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({ success: false }, 500));

    vi.stubGlobal('fetch', fetchMock);

    await expect(postWithCsrf('/api/auth/logout')).rejects.toThrow('CSRF');
  });
});
