import type { DocumentUpdateRequest } from '@/lib/validation/api-schemas';

type DocumentUpdatePayload = DocumentUpdateRequest['updates'];

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch('/api/auth/csrf');
  if (!response.ok) {
    throw new Error('Failed to fetch CSRF token');
  }

  const data = await response.json() as { success?: boolean; token?: string };
  if (!data?.success || !data.token) {
    throw new Error('Failed to fetch CSRF token');
  }

  return data.token;
}

export async function updateDocumentMetadata(
  documentId: string,
  updates: DocumentUpdatePayload
): Promise<Response> {
  const csrfToken = await fetchCsrfToken();

  return fetch('/api/documents', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({ documentId, updates }),
  });
}
