/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchDocumentsTool, SearchDocumentsInputSchema } from '@/lib/tools/search/search-documents';
import { searchRegulationsTool, SearchRegulationsInputSchema } from '@/lib/tools/search/search-regulations';
import { searchKnowledge, searchRegulations } from '@/lib/search';

vi.mock('@/lib/search', () => ({
  searchKnowledge: vi.fn(),
  searchRegulations: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('search tools', () => {
  it('marks an empty document search with its reason', async () => {
    vi.mocked(searchKnowledge).mockResolvedValue([]);
    const result = await searchDocumentsTool.execute({ keywords: ['差旅'] });
    expect(result).toMatchObject({
      success: true,
      data: { status: 'empty', empty: true, reason: expect.stringContaining('未找到相关文档'), results: [] },
    });
  });

  it('passes deduplicated keywords and filters to the document search', async () => {
    vi.mocked(searchKnowledge).mockResolvedValue([
      { documentId: 'doc-1', documentName: '示例制度', docType: 'policy', year: '2024', fileUrl: 'doc-1/f.pdf', sectionTitle: '总则', content: '示例内容', score: 3 },
    ]);
    const result = await searchDocumentsTool.execute({ keywords: ['差旅', '差旅', '报销'], year: '2024' });
    expect(searchKnowledge).toHaveBeenCalledWith(['差旅', '报销'], { year: '2024', docTypes: undefined });
    expect(result.data?.results[0]).toMatchObject({ document: '示例制度', section: '总则', documentId: 'doc-1' });
  });

  it('names regulation results in citation form', async () => {
    vi.mocked(searchRegulations).mockResolvedValue([
      { regulationName: '企业会计准则第22号-金融工具的确认和计量-2018', articleNumber: '第三十九条', content: '……', documentId: 'doc-22', fileUrl: 'doc-22/f.pdf', score: 9 },
    ]);
    const result = await searchRegulationsTool.execute({ keywords: ['金融资产', '减值'] });
    expect(result.data?.results[0]).toMatchObject({
      regulation: '《企业会计准则第22号——金融工具的确认和计量》',
      articleNumber: '第三十九条',
      documentId: 'doc-22',
    });
  });

  it('reports a failed search as "检索暂时失败", not as empty', async () => {
    vi.mocked(searchRegulations).mockRejectedValue(new Error('database down'));
    const result = await searchRegulationsTool.execute({ keywords: ['税率'] });
    expect(result.success).toBe(false);
    expect(result.error).toContain('检索暂时失败');
  });

  it('limits keywords to 1–8 words of 2–10 characters', () => {
    expect(SearchRegulationsInputSchema.safeParse({ keywords: ['税'] }).success).toBe(false);
    expect(SearchRegulationsInputSchema.safeParse({ keywords: [] }).success).toBe(false);
    expect(SearchRegulationsInputSchema.safeParse({ keywords: Array(9).fill('增值税') }).success).toBe(false);
    expect(SearchRegulationsInputSchema.safeParse({ keywords: ['这是一个超过十个字的关键词啊'] }).success).toBe(false);
    expect(SearchDocumentsInputSchema.parse({ keywords: ['差旅'], year: 2024 }).year).toBe('2024');
  });
});
