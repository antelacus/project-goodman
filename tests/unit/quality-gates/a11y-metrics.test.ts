// @vitest-environment node
import { extractA11yViolations } from '@/lib/quality-gates/a11y-metrics';

test('extractA11yViolations keeps only serious/critical and de-duplicates', () => {
  const results = {
    violations: [
      { id: 'color-contrast', impact: 'serious' },
      { id: 'aria-roles', impact: 'critical' },
      { id: 'duplicate', impact: 'serious' },
      { id: 'duplicate', impact: 'critical' },
      { id: 'minor-thing', impact: 'minor' },
      { id: 'unknown-impact', impact: null },
      { id: 'missing-impact' },
    ],
  };

  expect(extractA11yViolations(results)).toEqual([
    { id: 'aria-roles', impact: 'critical' },
    { id: 'color-contrast', impact: 'serious' },
    { id: 'duplicate', impact: 'critical' },
  ]);
});
