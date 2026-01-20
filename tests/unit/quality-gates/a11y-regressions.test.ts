// @vitest-environment node
import { compareA11yBaselines, type A11yBaseline } from '@/lib/quality-gates/a11y-metrics';

const baseline: A11yBaseline = {
  generatedAt: '2026-01-20T00:00:00.000Z',
  baseUrl: 'http://localhost:3000',
  pages: {
    '/': [
      { id: 'color-contrast', impact: 'serious' },
      { id: 'aria-roles', impact: 'critical' },
    ],
    '/chat': [],
  },
};

test('compareA11yBaselines flags new violations and severity upgrades', () => {
  const current: A11yBaseline = {
    ...baseline,
    pages: {
      ...baseline.pages,
      '/': [
        { id: 'color-contrast', impact: 'critical' },
        { id: 'new-violation', impact: 'serious' },
      ],
    },
  };

  const comparison = compareA11yBaselines(baseline, current);

  expect(comparison.regressions).toEqual([
    {
      path: '/',
      newViolations: [
        { id: 'color-contrast', impact: 'critical' },
        { id: 'new-violation', impact: 'serious' },
      ],
    },
  ]);
});

test('compareA11yBaselines reports missing pages', () => {
  const current: A11yBaseline = {
    ...baseline,
    pages: {
      '/': baseline.pages['/'],
    },
  };

  const comparison = compareA11yBaselines(baseline, current);

  expect(comparison.missing).toEqual(['/chat']);
});

test('compareA11yBaselines returns no regressions within baseline', () => {
  const current: A11yBaseline = {
    ...baseline,
    pages: {
      ...baseline.pages,
      '/': [
        { id: 'color-contrast', impact: 'serious' },
      ],
    },
  };

  const comparison = compareA11yBaselines(baseline, current);

  expect(comparison.regressions).toEqual([]);
  expect(comparison.missing).toEqual([]);
});
