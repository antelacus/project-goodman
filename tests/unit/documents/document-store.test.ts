import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDocumentStore, type Document } from '@/store/documents';

describe('document store deleteDocument', () => {
  const createDocument = (): Document => ({
    id: 'doc-123',
    name: 'Test.pdf',
    type: 'pdf',
    docCategory: 'knowledge',
    uploadTime: new Date().toISOString(),
    status: 'ready',
    size: 123,
  });

  let originalFetch: typeof fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    useDocumentStore.setState({ documents: [], isLoading: false, error: null });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('requests a CSRF token before deleting a document', async () => {
    const document = createDocument();
    useDocumentStore.setState({ documents: [document] });

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

    await useDocumentStore.getState().deleteDocument(document.id);

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/csrf');
    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/documents?id=${document.id}`, {
      method: 'DELETE',
      headers: {
        'x-csrf-token': csrfToken,
      },
    });
  });
});
