// @vitest-environment node
// Acceptance tests for docs/features/ai-provider/REQ.md, one per §-id, one file per
// batch (TRACK 二) so each batch's mocks stay its own. A batch writes its bodies
// first (red), then builds until they pass; the version cannot close while a todo
// is left.

import { createRequire } from 'module';
import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { installFakeRelay, chatReply, type RelayRequest } from '../../stubs/fake-relay';
import { AIUnavailableError } from '@/lib/ai';
import { analyzeSectionsNode } from '@/lib/workflows/report/nodes/analyze-sections';
import { assembleReportNode } from '@/lib/workflows/report/nodes/assemble-report';
import { REPORT_SECTIONS } from '@/lib/workflows/report/constants';
import type { MetricResult, ReportWorkflowState } from '@/lib/workflows/report/state';
import { ReportSummary } from '@/components/reports/ReportSummary';
import { FinancialMetrics } from '@/lib/financial/metric-names';
import { createServerSupabaseClient } from '@/lib/database';
import * as security from '@/lib/security';
import { unifiedAgentGraph } from '@/lib/workflows/unified/graph';
import { POST as chatPOST } from '@/app/api/chat/stream/route';
import { POST as extractPOST } from '@/app/api/quick-actions/extract/route';
import { POST as adminUploadPOST } from '@/app/api/admin/upload-database-document/route';

vi.mock('@/lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logRequest: vi.fn(),
  logError: vi.fn(),
  logWorkflowEvent: vi.fn(),
}));
vi.mock('@/lib/security', () => ({
  ensureSession: vi.fn(),
  checkGuestRate: vi.fn(),
  incrementGuestRate: vi.fn(),
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
vi.mock('@/lib/documents/storage', () => ({
  uploadFileToStorage: vi.fn().mockResolvedValue('https://storage.test/file'),
  downloadFileAsBase64: vi.fn(),
  getFirstFileForDocument: vi.fn(),
}));
vi.mock('@/lib/workflows/unified/graph', () => ({ unifiedAgentGraph: { streamEvents: vi.fn() } }));

const relay = installFakeRelay();
const aiDown = { status: 400, body: { error: { message: 'bad request', type: 'invalid_request_error' } } };
const userText = (req: RelayRequest) => JSON.stringify(req.body.messages ?? req.body.input ?? '');

const guest = {
  session: {
    token: 't', createdAt: '', expiresAt: '', ip: '127.0.0.1', userAgent: 'vitest',
    sessionId: '550e8400-e29b-41d4-a716-446655440000', role: 'guest' as const,
  },
  isNewSession: false,
};

beforeEach(() => {
  relay.reset();
  vi.mocked(security.ensureSession).mockResolvedValue(guest);
  vi.mocked(security.checkGuestRate).mockResolvedValue({ allowed: true, remaining: 4, total: 5, resetsAt: Date.now() + 3600_000 });
  vi.mocked(security.verifyAdminPassword).mockResolvedValue(true);
});

function reportState(): ReportWorkflowState {
  const primary: Record<string, MetricResult> = {};
  for (const section of REPORT_SECTIONS) {
    for (const toolName of section.metrics) {
      primary[toolName] = { toolName, displayName: toolName, value: 1.5, formatted: '1.50', unit: '', sourceDocumentIds: [] };
    }
  }
  return {
    input: { year: '2024', ownerId: 'admin', ownerType: 'admin' },
    dataAvailability: { primaryYearAvailable: true, comparisonYearAvailable: false, partialComparison: false, availableYears: ['2024'], status: 'checked' },
    metricResults: { primary, comparison: {}, status: 'gathered' },
    contextDocuments: { sourceDocuments: [] },
    sections: [],
    meta: { startTime: Date.now(), currentPhase: 3 },
  };
}

async function generateReport() {
  const state = reportState();
  Object.assign(state, await analyzeSectionsNode(state));
  return (await assembleReportNode(state)).report!;
}

describe('B2 failures are shown, never fabricated', () => {
  it('§report-section-failure a failed section keeps its metrics table and shows the failure text; no fallback analysis anywhere in the report', async () => {
    relay.reply(req => (userText(req).includes('偿债能力分析') ? aiDown : { body: chatReply('分析文字') }));
    const report = await generateReport();

    const solvency = report.sections.find(s => s.id === 'solvency')!;
    expect(solvency.analysisStatus).toBe('failed');
    expect(solvency.analysis).toBe('分析生成失败（AI 服务不可用）');
    expect(solvency.metrics.map(m => m.formatted)).toEqual(REPORT_SECTIONS[1].metrics.map(() => '1.50'));
    for (const other of report.sections.filter(s => s.id !== 'solvency')) {
      expect(other.analysisStatus).toBe('ok');
    }
    const everything = JSON.stringify(report);
    expect(everything).not.toContain('各项指标表现正常');
    expect(everything).not.toContain('财务数据已汇总完成');
  });

  it('§report-summary-failure a failed section or a failed summary call yields "摘要未生成" with empty key findings', async () => {
    relay.reply(req => (userText(req).includes('偿债能力分析') ? aiDown : { body: chatReply('分析文字') }));
    const partial = await generateReport();
    expect(partial.summary).toMatchObject({ status: 'not_generated', reason: '摘要未生成：部分章节的分析生成失败', keyFindings: [] });
    expect(relay.requests.some(r => userText(r).includes('执行摘要'))).toBe(false);

    relay.reset();
    relay.reply(req => (userText(req).includes('执行摘要') ? aiDown : { body: chatReply('分析文字') }));
    const noSummary = await generateReport();
    expect(noSummary.summary).toMatchObject({ status: 'not_generated', reason: '摘要未生成：AI 服务不可用', keyFindings: [] });

    const html = renderToStaticMarkup(createElement(ReportSummary, { summary: noSummary.summary }));
    expect(html).toContain('摘要未生成：AI 服务不可用');
  });

  it('§chat-failure an AI failure in chat reaches the user as "AI 服务暂时不可用，请稍后再试"', async () => {
    vi.mocked(unifiedAgentGraph.streamEvents).mockImplementation(() => {
      throw new AIUnavailableError('chat', 'timeout');
    });
    const response = await chatPOST(
      new NextRequest('http://localhost/api/chat/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: '流动比率怎么算？' }),
      })
    );
    // The route enqueues strings, which Response.text() rejects; read chunks directly.
    const reader = response.body!.getReader();
    let text = '';
    for (let r = await reader.read(); !r.done; r = await reader.read()) {
      text += typeof r.value === 'string' ? r.value : new TextDecoder().decode(r.value);
    }
    const errorEvents = text
      .split('\n\n')
      .filter(block => block.startsWith('event: error'))
      .map(block => JSON.parse(block.split('\n').find(l => l.startsWith('data: '))!.slice(6)));
    expect(errorEvents).toEqual([{ message: 'AI 服务暂时不可用，请稍后再试' }]);
    expect(text).not.toContain('AI call for chat failed');
  });

  describe('§extract-failure', () => {
    const BS = FinancialMetrics.BalanceSheet as Record<string, string>;
    const zeroTotals = Object.entries(BS).filter(([k]) => k.includes('TOTAL')).map(([, metric]) => ({ metric, value: 0 }));
    const twoPeriods = JSON.stringify({
      documentType: 'balance_sheet',
      data: [
        { year: '2024', period: 'annual', items: zeroTotals },
        { year: '2023', period: 'annual', items: [...zeroTotals, { metric: '资产负债表-流动资产-货币资金', value: 100 }] },
      ],
    });

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

    const adminUpload = () =>
      adminUploadPOST(
        new NextRequest('http://localhost/api/admin/upload-database-document', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            documentText: Buffer.from('示例公司 资产负债表（合成数据）\n货币资金 100\n流动资产合计 0').toString('base64'),
            fileName: 'synthetic-bs.txt',
            documentType: 'balance_sheet',
            adminPassword: 'pw',
          }),
        })
      );

    it('an extraction failure fails both upload routes and writes no financial_data rows', async () => {
      relay.reply(() => aiDown);

      const user = await extractPOST(
        new NextRequest('http://localhost/api/quick-actions/extract', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ fileData: Buffer.from('png').toString('base64'), fileName: 'scan.png', fileType: 'image/png' }),
        })
      );
      expect(user.ok).toBe(false);
      expect((await user.json()).message).toBe('数据提取失败（AI 服务不可用），未写入任何数据');

      const inserts = fakeDb();
      const admin = await adminUpload();
      expect(admin.ok).toBe(false);
      expect((await admin.json()).message).toBe('数据提取失败（AI 服务不可用），未写入任何数据');
      expect(inserts).toEqual({});
    });

    it('a second period failing validation fails the admin upload and writes nothing', async () => {
      relay.reply(() => ({ body: chatReply(twoPeriods) }));
      const inserts = fakeDb();
      const admin = await adminUpload();
      expect(admin.status).toBe(400);
      expect((await admin.json()).error).toContain('Validation failed for 2023');
      expect(inserts).toEqual({});
    });
  });

  it('§smoke-report the staging smoke check fails when any report section failed', async () => {
    const { reportFailures } = createRequire(import.meta.url)('../../../scripts/smoke-test-staging.js');
    relay.reply(req => (userText(req).includes('偿债能力分析') ? aiDown : { body: chatReply('分析文字') }));
    expect(reportFailures(await generateReport())).not.toEqual([]);

    relay.reset();
    relay.reply(req => (userText(req).includes('执行摘要') ? { body: chatReply('{"keyFindings":["a"],"riskWarnings":[],"recommendations":["b"]}') } : { body: chatReply('分析文字') }));
    expect(reportFailures(await generateReport())).toEqual([]);
  });
});
