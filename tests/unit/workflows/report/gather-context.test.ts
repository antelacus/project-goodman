/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gatherContextNode } from '@/lib/workflows/report/nodes/gather-context';
import { createInitialState } from '@/lib/workflows/report/state';
import type { MetricResult, ReportWorkflowState } from '@/lib/workflows/report/state';
import { createServerSupabaseClient } from '@/lib/database/supabase';

vi.mock('@/lib/database/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}));

type DocumentRow = {
  id: string;
  name: string;
  doc_type: string | null;
  year?: string | null;
  period?: string | null;
  file_url?: string | null;
};

type ChunkRow = { content: string };

type SupabaseMockInput = {
  documents: DocumentRow[];
  chunksByDocumentId: Record<string, ChunkRow[]>;
};

function createSupabaseMock({ documents, chunksByDocumentId }: SupabaseMockInput) {
  return {
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const query = {
        select: vi.fn(() => query),
        in: vi.fn((column: string, values: string[]) => {
          if (table === 'documents' && column === 'id') {
            const data = documents.filter(doc => values.includes(doc.id));
            return Promise.resolve({ data, error: null });
          }
          return Promise.resolve({ data: [], error: null });
        }),
        eq: vi.fn((column: string, value: unknown) => {
          filters[column] = value;
          return query;
        }),
        limit: vi.fn(() => {
          if (table === 'documents') {
            const data = documents.filter(doc =>
              Object.entries(filters).every(([key, value]) => (doc as Record<string, unknown>)[key] === value)
            );
            return Promise.resolve({ data: data.slice(0, 1), error: null });
          }
          return Promise.resolve({ data: [], error: null });
        }),
        order: vi.fn(() => {
          if (table === 'document_chunks') {
            const documentId = filters.document_id as string | undefined;
            const data = documentId ? (chunksByDocumentId[documentId] || []) : [];
            return Promise.resolve({ data, error: null });
          }
          return Promise.resolve({ data: [], error: null });
        }),
      };

      return query;
    },
  };
}

function buildMetricResult(documentId: string): MetricResult {
  return {
    toolName: 'current_ratio',
    displayName: '流动比率',
    value: 1.23,
    formatted: '1.23',
    unit: '倍',
    sourceDocumentIds: [documentId],
  };
}

function buildState(): ReportWorkflowState {
  const state = createInitialState({
    year: '2024',
    ownerId: 'owner-1',
    ownerType: 'admin',
  });

  state.metricResults.primary = {
    current_ratio: buildMetricResult('source-doc'),
  };

  return state;
}

describe('gatherContextNode', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    warnSpy.mockClear();
  });

  it('loads company profile and financial policy content when documents exist', async () => {
    const supabase = createSupabaseMock({
      documents: [
        {
          id: 'company-doc',
          name: '公司详细档案.md',
          doc_type: 'business_info',
        },
        {
          id: 'policy-doc',
          name: '财务管理制度.md',
          doc_type: 'policy',
        },
        {
          id: 'source-doc',
          name: '资产负债表',
          doc_type: 'balance_sheet',
          year: '2024',
          period: 'annual',
        },
      ],
      chunksByDocumentId: {
        'company-doc': [{ content: '公司档案内容' }],
        'policy-doc': [{ content: '制度内容' }],
      },
    });

    vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as never);

    const result = await gatherContextNode(buildState());

    expect(result.contextDocuments?.companyProfile).toContain('公司档案内容');
    expect(result.contextDocuments?.financialPolicy).toContain('制度内容');
    expect(result.contextDocuments?.sourceDocuments?.[0]?.documentId).toBe('source-doc');
  });

  it('truncates context content to avoid oversized prompts', async () => {
    const longContent = 'A'.repeat(13000);
    const supabase = createSupabaseMock({
      documents: [
        {
          id: 'company-doc',
          name: '公司详细档案.md',
          doc_type: 'business_info',
        },
        {
          id: 'policy-doc',
          name: '财务管理制度.md',
          doc_type: 'policy',
        },
      ],
      chunksByDocumentId: {
        'company-doc': [{ content: longContent }],
        'policy-doc': [{ content: '制度内容' }],
      },
    });

    vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as never);

    const result = await gatherContextNode(buildState());

    expect(result.contextDocuments?.companyProfile?.length).toBe(12000);
  });

  it('warns and continues when context documents are missing or empty', async () => {
    const supabase = createSupabaseMock({
      documents: [
        {
          id: 'company-doc',
          name: '公司详细档案.md',
          doc_type: 'business_info',
        },
      ],
      chunksByDocumentId: {
        'company-doc': [],
      },
    });

    vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as never);

    const result = await gatherContextNode(buildState());

    expect(result.contextDocuments?.companyProfile).toBeUndefined();
    expect(result.contextDocuments?.financialPolicy).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('applies timeout handling when fetching context content', async () => {
    const timeoutSpy = vi.spyOn(global, 'setTimeout');
    const supabase = createSupabaseMock({
      documents: [
        {
          id: 'company-doc',
          name: '公司详细档案.md',
          doc_type: 'business_info',
        },
      ],
      chunksByDocumentId: {
        'company-doc': [{ content: '公司档案内容' }],
      },
    });

    vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as never);

    await gatherContextNode(buildState());

    const usedTimeout = timeoutSpy.mock.calls.some((call) => call[1] === 5000);
    timeoutSpy.mockRestore();

    expect(usedTimeout).toBe(true);
  });
});
