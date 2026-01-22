import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateDocumentMetadata } from '@/lib/documents/update-document-metadata';

describe('updateDocumentMetadata', () => {
  let originalFetch: typeof fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('includes a CSRF token header when updating document metadata', async () => {
    const csrfToken = 'csrf-token';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, token: csrfToken }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

    globalThis.fetch = fetchMock as typeof fetch;

    await updateDocumentMetadata('doc-123', { name: 'Updated Name' });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/csrf');
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/documents', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({
        documentId: 'doc-123',
        updates: { name: 'Updated Name' },
      }),
    });
  });
});
