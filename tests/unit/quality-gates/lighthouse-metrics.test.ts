// @vitest-environment node
import {
  compareLighthouseScores,
  extractLighthousePath,
  extractLighthouseScores,
} from '@/lib/quality-gates/lighthouse-metrics';

const sampleReport = {
  requestedUrl: 'http://localhost:3000/chat',
  categories: {
    performance: { score: 0.93 },
    accessibility: { score: 0.88 },
  },
};

test('extractLighthouseScores converts scores to 0-100 scale', () => {
  expect(extractLighthouseScores(sampleReport)).toEqual({
    performance: 93,
    accessibility: 88,
  });
});

test('extractLighthousePath uses requestedUrl pathname', () => {
  expect(extractLighthousePath(sampleReport)).toBe('/chat');
});

test('compareLighthouseScores flags regressions beyond threshold', () => {
  const baseline = {
    '/': { performance: 95, accessibility: 92 },
  };
  const current = {
    '/': { performance: 78, accessibility: 90 }, // 17-point drop exceeds 15-point threshold
  };

  const comparison = compareLighthouseScores(baseline, current);

  expect(comparison.regressions).toEqual([
    expect.objectContaining({
      path: '/',
      category: 'performance',
      baseline: 95,
      current: 78,
      allowed: 80, // 95 - 15 = 80
    }),
  ]);
});

test('compareLighthouseScores reports missing pages', () => {
  const baseline = {
    '/': { performance: 95, accessibility: 92 },
  };

  const comparison = compareLighthouseScores(baseline, {});

  expect(comparison.missing).toEqual(['/']);
});

test('compareLighthouseScores returns no regressions within threshold', () => {
  const baseline = {
    '/': { performance: 95, accessibility: 92 },
  };
  const current = {
    '/': { performance: 91, accessibility: 90 },
  };

  const comparison = compareLighthouseScores(baseline, current);

  expect(comparison.regressions).toEqual([]);
  expect(comparison.missing).toEqual([]);
});
