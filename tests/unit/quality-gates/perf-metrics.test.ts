// @vitest-environment node
import { comparePerfBaselines, type PerfBaseline } from '@/lib/quality-gates/perf-metrics';

const baseline: PerfBaseline = {
  generatedAt: '2026-01-19T00:00:00.000Z',
  baseUrl: 'http://localhost:3000',
  scenarios: {
    'chat.stream': {
      name: 'chat.stream',
      method: 'POST',
      path: '/api/chat/stream',
      latencyMs: { p50: 40, p95: 100, p99: 140 },
      errorRate: 0.02,
    },
  },
};

test('comparePerfBaselines flags p95 regression over threshold', () => {
  const current: PerfBaseline = {
    ...baseline,
    scenarios: {
      'chat.stream': {
        ...baseline.scenarios['chat.stream'],
        latencyMs: { p50: 50, p95: 121, p99: 160 },
      },
    },
  };

  const comparison = comparePerfBaselines(baseline, current);

  expect(comparison.regressions).toEqual([
    expect.objectContaining({
      scenario: 'chat.stream',
      metric: 'p95',
      baseline: 100,
      current: 121,
      allowed: 120,
    }),
  ]);
});

test('comparePerfBaselines flags error-rate regression over threshold', () => {
  const current: PerfBaseline = {
    ...baseline,
    scenarios: {
      'chat.stream': {
        ...baseline.scenarios['chat.stream'],
        errorRate: 0.061,
      },
    },
  };

  const comparison = comparePerfBaselines(baseline, current);

  expect(comparison.regressions).toEqual([
    expect.objectContaining({
      scenario: 'chat.stream',
      metric: 'errorRate',
      baseline: 0.02,
      current: 0.061,
      allowed: 0.024,
    }),
  ]);
});

test('comparePerfBaselines reports missing scenarios', () => {
  const current: PerfBaseline = {
    ...baseline,
    scenarios: {},
  };

  const comparison = comparePerfBaselines(baseline, current);

  expect(comparison.missing).toEqual(['chat.stream']);
});

test('comparePerfBaselines returns no regressions within threshold', () => {
  const current: PerfBaseline = {
    ...baseline,
    scenarios: {
      'chat.stream': {
        ...baseline.scenarios['chat.stream'],
        latencyMs: { p50: 45, p95: 110, p99: 150 },
        errorRate: 0.021,
      },
    },
  };

  const comparison = comparePerfBaselines(baseline, current);

  expect(comparison.regressions).toEqual([]);
  expect(comparison.missing).toEqual([]);
});
