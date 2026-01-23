/* @vitest-environment jsdom */
import React, { useEffect, act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { notifyGuestRateUpdate } from '@/lib/security/guest-rate-client';
import { useReportGeneration } from '@/hooks/useReportGeneration';
import type { ReportContent } from '@/types/report';

vi.mock('@/lib/security/guest-rate-client', () => ({
  notifyGuestRateUpdate: vi.fn(),
}));

const reportFixture: ReportContent = {
  title: '2024年度财务综合分析报告',
  generatedAt: '2026-01-22T00:00:00.000Z',
  year: '2024',
  comparisonYear: '2023',
  sections: [],
  summary: {
    keyFindings: ['流动性改善。'],
    riskWarnings: ['需关注应收账款回收周期。'],
    recommendations: ['优化存货管理策略。'],
  },
};

function createSseResponse() {
  const encoder = new TextEncoder();
  const event = {
    type: 'complete',
    data: {
      reportId: 'report-id',
      content: reportFixture,
      generationTimeMs: 1200,
    },
  };

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });
}

function HookHarness({ onReady }: { onReady: (value: ReturnType<typeof useReportGeneration>) => void }) {
  const hook = useReportGeneration();

  useEffect(() => {
    onReady(hook);
  }, [hook, onReady]);

  return null;
}

describe('useReportGeneration', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container?.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('saves report and returns docx url', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url === '/api/reports/generate') {
        return createSseResponse();
      }

      if (url === '/api/auth/csrf') {
        return Response.json({ success: true, token: 'csrf-token' });
      }

      if (url === '/api/reports/save') {
        return Response.json({
          success: true,
          data: {
            reportId: 'report-id',
            docxUrl: 'https://example.com/report.docx',
          },
        });
      }

      throw new Error(`Unexpected fetch to ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    let hook: ReturnType<typeof useReportGeneration> | null = null;

    await act(async () => {
      root?.render(<HookHarness onReady={(value) => { hook = value; }} />);
    });

    await act(async () => {
      await hook?.startGeneration('2024', '2023');
    });

    let result: Awaited<ReturnType<typeof hook.saveReport>> | null = null;

    await act(async () => {
      result = await hook?.saveReport() ?? null;
    });

    expect(result?.docxUrl).toBe('https://example.com/report.docx');
    expect(hook?.savedDocxUrl).toBe('https://example.com/report.docx');
    expect(fetchMock).toHaveBeenCalledWith('/api/reports/save', expect.any(Object));
  });

  it('notifies guest rate updates when report generation is rejected', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url === '/api/reports/generate') {
        return Response.json({ error: 'rate limited' }, { status: 429 });
      }

      throw new Error(`Unexpected fetch to ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    let hook: ReturnType<typeof useReportGeneration> | null = null;

    await act(async () => {
      root?.render(<HookHarness onReady={(value) => { hook = value; }} />);
    });

    await act(async () => {
      await hook?.startGeneration('2024');
    });

    expect(notifyGuestRateUpdate).toHaveBeenCalledTimes(1);
  });
});
