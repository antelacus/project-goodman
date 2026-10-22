// @vitest-environment node
// Acceptance tests for docs/features/ai-provider/REQ.md, one per §-id, one file per
// batch (TRACK 二) so each batch's mocks stay its own. A batch writes its bodies
// first (red), then builds until they pass; the version cannot close while a todo
// is left.
// Asserted elsewhere: §reg-integrity on the 45 real documents — scripts/resplit-regulations.ts

import { NextRequest } from 'next/server';
import { splitRegulation } from '@/lib/extraction/regulation-splitter';
import { createServerSupabaseClient } from '@/lib/database';
import { uploadFileToStorage } from '@/lib/documents/storage';
import * as security from '@/lib/security';
import { POST as adminUploadPOST } from '@/app/api/admin/upload-database-document/route';
import { extractText } from 'unpdf';
import { readDocumentText } from '@/lib/ai';

vi.mock('@/lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logRequest: vi.fn(),
  logError: vi.fn(),
  logWorkflowEvent: vi.fn(),
}));
vi.mock('@/lib/security', () => ({
  verifyAdminPassword: vi.fn(),
  validateFileByExtension: vi.fn(() => ({ valid: true })),
  generateRequestId: () => 'req-1',
  createErrorResponse: (error: unknown, requestId: string, status = 500) =>
    new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error), requestId }), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
}));
vi.mock('@/lib/database', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('@/lib/documents/storage', () => ({ uploadFileToStorage: vi.fn() }));
vi.mock('unpdf', () => ({ extractText: vi.fn() }));
vi.mock('@/lib/ai', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai')>()),
  readDocumentText: vi.fn(),
}));

// A synthetic standard, three pages. Article 2 quotes article 1 in-text; article 3
// wraps a reference to article 4 onto the start of a line, which is the trap.
const PAGES = [
  ['1', '企业会计准则第99号——示例业务', '第一章 总则', '第一条 为了规范示例业务的会计处理，制定本准则。',
    '第二条 企业应当按照本准则第一条的规定处理示例业务。'].join('\n'),
  ['2', '第二章 确认和计量', '第三条 示例资产应当按照本准则', '第四条规定的方法进行后续计量，',
    '并在附注中披露。'].join('\n'),
  ['3', '第四条 本准则自 2026 年 1 月 1 日起施行。'].join('\n'),
];

describe('B3 regulation re-split', () => {
  it('§reg-split-rule an in-text "按照本准则第X条的规定" does not start a new article', () => {
    const { articles } = splitRegulation(PAGES, 3);
    expect(articles.map(a => a.articleNumber)).toEqual(['第一条', '第二条', '第三条', '第四条']);
    expect(articles[1].content).toBe('第二条 企业应当按照本准则第一条的规定处理示例业务。');
    expect(articles[2].content).toBe('第三条 示例资产应当按照本准则\n第四条规定的方法进行后续计量，\n并在附注中披露。');
  });

  it('§reg-split-rule a wrapped line starting with 附表 inside an article is content; an appendix starts only after a sentence ends', () => {
    const { articles, anomalies } = splitRegulation([
      ['第一条 纳税人应当按规定填报', '附表一所列项目，并按期申报。', '第二条 本法自公布之日起施行。',
        '附表一 申报项目表', '项目 金额'].join('\n'),
    ], 1);
    expect(articles.map(a => a.articleNumber)).toEqual(['第一条', '第二条']);
    expect(articles[0].content).toContain('附表一所列项目');
    expect(articles[1].content).not.toContain('申报项目表');
    expect(anomalies.filter(a => a.kind === 'appendix_after_articles')).toHaveLength(1);
  });

  it('§reg-integrity articles are consecutive with no duplicates, page count matches, and no body line is left unassigned', () => {
    const { articles, anomalies } = splitRegulation(PAGES, 3);
    expect(articles.map(a => a.number)).toEqual([1, 2, 3, 4]);
    expect(articles[2].hierarchy).toEqual(['第二章 确认和计量']);

    // Every body line after the first article, minus headings and page numbers,
    // sits in exactly one article.
    const body = PAGES.flatMap(p => p.split('\n'))
      .slice(3)
      .filter(l => !/^\d+$/.test(l) && !/^第.+章 /.test(l));
    const assigned = articles.flatMap(a => a.content.split('\n'));
    expect(assigned).toEqual(body);

    // The wrapped reference to the next number is reported, not silently kept.
    expect(anomalies).toEqual([{ kind: 'next_number_as_reference', page: 2, line: '第四条规定的方法进行后续计量，' }]);

    expect(splitRegulation(PAGES.slice(0, 2), 3)).toEqual({
      articles: [],
      anomalies: [{ kind: 'page_count_mismatch', expected: 3, extracted: 2 }],
    });
  });

  describe('admin regulation upload', () => {
    function fakeDb() {
      const inserts: Record<string, number> = {};
      vi.mocked(createServerSupabaseClient).mockReturnValue({
        from: (table: string) => ({
          insert: vi.fn(() => {
            inserts[table] = (inserts[table] ?? 0) + 1;
            const done = Promise.resolve({ error: null });
            return Object.assign(done, { select: () => ({ single: () => done }) });
          }),
          delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        }),
      } as unknown as ReturnType<typeof createServerSupabaseClient>);
      return inserts;
    }

    const upload = (text: string, documentType = 'accounting_standard', fileName = '企业会计准则第99号-示例业务-2026.txt') =>
      adminUploadPOST(
        new NextRequest('http://localhost/api/admin/upload-database-document', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            documentText: Buffer.from(text).toString('base64'),
            fileName,
            documentType,
            adminPassword: 'pw',
          }),
        })
      );

    beforeEach(() => {
      vi.mocked(security.verifyAdminPassword).mockResolvedValue(true);
      vi.mocked(uploadFileToStorage).mockResolvedValue('doc/file.txt');
    });

    it('§reg-upload-dup an admin upload whose split repeats an article number fails and writes no articles', async () => {
      const inserts = fakeDb();
      const response = await upload(
        ['第一条 为了规范示例业务，制定本准则。', '第二条 示例业务应当确认。', '第二条 示例业务应当计量。'].join('\n')
      );
      expect(response.ok).toBe(false);
      expect((await response.json()).message).toBe('条款拆分异常：第二条重复');
      expect(inserts).toEqual({});
    });

    it('§reg-upload-dup a regulation upload that splits into no articles fails and writes nothing, since neither search could reach it', async () => {
      const inserts = fakeDb();
      const response = await upload('示例业务的会计处理按公司惯例执行。');
      expect(response.ok).toBe(false);
      expect((await response.json()).message).toBe('条款拆分异常：未拆出任何条款');
      expect(inserts).toEqual({});
    });

    it('§reg-upload-dup a company policy is not split into regulation articles, so repeated numbering does not block it', async () => {
      const inserts = fakeDb();
      const response = await upload(
        ['第一章 报销', '第一条 差旅按标准报销。', '第二章 借款', '第一条 借款须审批。'].join('\n'),
        'policy'
      );
      expect(response.ok).toBe(true);
      expect(inserts.structured_regulations).toBeUndefined();
      expect(inserts.document_chunks).toBeGreaterThan(0);
    });

    it('§reg-upload-dup a PDF is parsed once: its pages feed the split, and a regulation read as a scan fails with the reason', async () => {
      const inserts = fakeDb();
      vi.mocked(extractText).mockResolvedValue({ totalPages: 3, text: PAGES } as never);
      const parsed = await upload('%PDF-synthetic', 'accounting_standard', '示例准则.pdf');
      expect(parsed.ok).toBe(true);
      expect(extractText).toHaveBeenCalledTimes(1);

      vi.mocked(extractText).mockClear().mockRejectedValue(new Error('bad xref'));
      vi.mocked(readDocumentText).mockResolvedValue(PAGES.join('\n'));
      const scanned = await upload('%PDF-synthetic', 'accounting_standard', '示例准则.pdf');
      expect(extractText).toHaveBeenCalledTimes(1);
      expect(scanned.status).toBe(400);
      expect((await scanned.json()).message).toBe('条款拆分异常：PDF 没有可提取的文字层，无法按页拆分');
      expect(inserts.structured_regulations).toBe(1);
    });

    it('§reg-upload-storage an admin regulation upload whose file storage fails writes no document and no articles', async () => {
      vi.mocked(uploadFileToStorage).mockRejectedValue(new Error('storage down'));
      const inserts = fakeDb();
      const response = await upload(PAGES.join('\n'));
      expect(response.ok).toBe(false);
      expect((await response.json()).message).toBe('原文件存储失败，未写入任何数据');
      expect(inserts).toEqual({});
    });
  });
});
