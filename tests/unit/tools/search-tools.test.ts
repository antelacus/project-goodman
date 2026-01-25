/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchDocumentsTool } from '@/lib/tools/search/search-documents';
import { searchRegulationsTool } from '@/lib/tools/search/search-regulations';
import {
  SearchDocumentsInputSchema,
} from '@/lib/tools/search/search-documents';
import {
  SearchRegulationsInputSchema,
} from '@/lib/tools/search/search-regulations';
import { searchDocuments } from '@/lib/documents/search';
import { matchDocuments } from '@/lib/database';

vi.mock('@/lib/documents/search', () => ({
  searchDocuments: vi.fn(),
}));

vi.mock('@/lib/database', () => ({
  createServerSupabaseClient: vi.fn(() => ({})),
  matchDocuments: vi.fn(),
}));

vi.mock('openai', () => ({
  default: class OpenAI {
    embeddings = {
      create: vi.fn().mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      }),
    };
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('search tools output normalization', () => {
  it('marks search_documents results as empty with reason', async () => {
    vi.mocked(searchDocuments).mockResolvedValue({
      documents: [],
      totalMatches: 0,
      searchMeta: { queryKeywords: [], searchDuration: 0 },
    });

    const result = await searchDocumentsTool.execute({ query: '测试' });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      empty: true,
      reason: expect.stringContaining('未找到相关文档'),
      meta: { total: 0 },
    });
  });

  it('marks search_documents results as non-empty when matches exist', async () => {
    vi.mocked(searchDocuments).mockResolvedValue({
      documents: [
        {
          documentId: 'doc-1',
          documentName: '示例文档',
          docType: 'pdf',
          year: '2024',
          period: 'annual',
          relevanceScore: 95,
          matchedChunks: [
            {
              chunkId: 'chunk-1',
              content: '示例内容',
              sectionTitle: '概览',
              sectionPath: '概览',
              similarity: 0.9,
              sourceType: 'hybrid',
            },
          ],
        },
      ],
      totalMatches: 1,
      searchMeta: { queryKeywords: [], searchDuration: 0 },
    });

    const result = await searchDocumentsTool.execute({ query: '测试' });

    expect(result.success).toBe(true);
    expect(result.data?.empty).toBe(false);
    expect(result.data?.meta).toMatchObject({ total: 1 });
  });

  it('marks search_regulations results as empty with reason', async () => {
    vi.mocked(matchDocuments).mockResolvedValue([]);

    const result = await searchRegulationsTool.execute({ query: '税法' });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      empty: true,
      reason: expect.stringContaining('未找到相关法规'),
      meta: { total: 0 },
    });
  });

  it('coerces search input year/limit from strings', () => {
    const parsedDocs = SearchDocumentsInputSchema.parse({
      query: '测试',
      year: '2024',
      limit: '3',
    });

    expect(parsedDocs.year).toBe(2024);
    expect(parsedDocs.limit).toBe(3);

    const parsedRegs = SearchRegulationsInputSchema.parse({
      query: '税法',
      limit: '2',
    });

    expect(parsedRegs.limit).toBe(2);
  });
});
