// @vitest-environment node
// Acceptance tests for docs/features/public-readiness/REQ.md §5.2 and §5.7 (batch B6).

import { NextRequest } from 'next/server';
import * as security from '@/lib/security';
import * as storage from '@/lib/documents/storage';
import { GET as previewGET } from '@/app/api/documents/preview-url/route';
import { GET as sessionGET } from '@/app/api/sessions/[id]/route';
import { POST as adminUploadPOST } from '@/app/api/admin/upload-database-document/route';
import { extractDocumentTool } from '@/lib/tools/extraction/extract-document';

type Row = { id: string; file_url: string | null; doc_category: string; owner_type: string; owner_id: string | null };
const db = vi.hoisted(() => ({ calls: 0, documents: [] as Row[], chunks: [] as Array<{ document_id: string; content: string }> }));

vi.mock('@/lib/database', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/database')>()),
  createServerSupabaseClient: () => {
    db.calls += 1;
    return {
      from: (table: string) => ({
        select: () => ({
          eq: (column: string, value: string) => ({
            maybeSingle: async () => ({ data: db.documents.find(d => d.id === value) ?? null, error: null }),
            order: async () => ({ data: table === 'document_chunks' ? db.chunks.filter(c => c.document_id === value) : [], error: null }),
          }),
        }),
      }),
    };
  },
}));
// The admin upload route requires an admin session (v4.7.4).
vi.mock('@/lib/security/guest-session', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/security/guest-session')>()),
  requireAdmin: vi.fn(async () => ({ role: 'admin', sessionId: 's', userId: 'u' })),
}));
vi.mock('@/lib/security', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/security')>()),
  verifySession: vi.fn(),
  ensureSession: vi.fn(),
  verifyAdminPassword: vi.fn(async () => ({ valid: true, needsRehash: false })),
}));
vi.mock('@/lib/documents/storage', () => ({
  getSignedFileUrl: vi.fn(async (path: string) => `https://storage.test/signed/${path}`),
  uploadFileToStorage: vi.fn(),
  deleteFileFromStorage: vi.fn(),
}));
vi.mock('@/lib/extraction', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/extraction')>()),
  performStructuredExtraction: vi.fn(async () => ({ type: 'general', confidence: 1, data: {} })),
}));
vi.mock('@/lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logRequest: vi.fn(),
  logError: vi.fn(),
  logWorkflowEvent: vi.fn(),
}));

const GUEST = '550e8400-e29b-41d4-a716-446655440000';
const LIBRARY = '7f1c2a3e-4b5d-4c6e-8f70-1a2b3c4d5e6f';
const MINE = '8a2d3b4f-5c6e-4d7f-9a81-2b3c4d5e6f70';
const THEIRS = '9b3e4c5a-6d7f-4e8a-8b92-3c4d5e6f7081';
const guestSession = { token: 't', createdAt: '', expiresAt: '', ip: '127.0.0.1', userAgent: 'vitest', sessionId: GUEST, role: 'guest' as const };

beforeEach(() => {
  db.calls = 0;
  db.documents = [
    { id: LIBRARY, file_url: 'lib/standard.pdf', doc_category: 'knowledge', owner_type: 'system', owner_id: null },
    { id: MINE, file_url: 'mine/contract.pdf', doc_category: 'business', owner_type: 'guest', owner_id: GUEST },
    { id: THEIRS, file_url: 'theirs/contract.pdf', doc_category: 'business', owner_type: 'guest', owner_id: 'someone-else' },
  ];
  db.chunks = db.documents.map(d => ({ document_id: d.id, content: `${d.id} 的正文。` }));
  vi.mocked(security.verifySession).mockResolvedValue(guestSession);
  vi.mocked(storage.getSignedFileUrl).mockClear();
});

const preview = (query: string) =>
  previewGET(new NextRequest(`http://localhost/api/documents/preview-url?${query}`, { headers: { cookie: 'session=t' } }));

describe('B6 input validation and document access', () => {
  it('§input-validation preview-url, sessions/[id] and admin upload-database-document each answer an invalid input with 400 and the standard error shape, without touching the database', async () => {
    const responses = [
      await preview('id=not-a-uuid'),
      await preview(`id=${LIBRARY}&fileUrl=theirs/contract.pdf`),
      await sessionGET(new NextRequest('http://localhost/api/sessions/nope'), { params: Promise.resolve({ id: 'nope' }) }),
      await adminUploadPOST(new NextRequest('http://localhost/api/admin/upload-database-document', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ documentText: 'x', fileName: 'a.md', documentType: 'not-a-type', adminPassword: 'x' }),
      })),
    ];
    for (const response of responses) {
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ success: false, error: expect.any(String) });
    }
    expect(db.calls).toBe(0);
  });

  it('§doc-access preview-url and extract_document read knowledge documents and the requester\'s own; someone else\'s is 404 / a failure without reading it; a fileUrl preview request is rejected', async () => {
    for (const id of [LIBRARY, MINE]) {
      const opened = await preview(`id=${id}&redirect=1`);
      expect(opened.status, id).toBe(307);
    }
    const refused = await preview(`id=${THEIRS}&redirect=1`);
    expect(refused.status).toBe(404);
    expect(storage.getSignedFileUrl).not.toHaveBeenCalledWith('theirs/contract.pdf');

    // Without a session only library documents open.
    vi.mocked(security.verifySession).mockResolvedValue(null);
    expect((await preview(`id=${MINE}`)).status).toBe(404);
    expect((await preview(`id=${LIBRARY}`)).status).toBe(200);

    const requester = { ownerType: 'guest' as const, ownerId: GUEST };
    expect(await extractDocumentTool.execute({ documentId: THEIRS }, requester)).toEqual({ success: false, error: 'Document not found' });
    for (const documentId of [LIBRARY, MINE]) {
      expect((await extractDocumentTool.execute({ documentId }, requester)).success, documentId).toBe(true);
    }
  });
});
