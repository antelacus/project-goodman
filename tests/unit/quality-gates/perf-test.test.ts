// @vitest-environment node
import { isPerfTestModeEnabled, isPerfTestRequest, PERF_TEST_HEADER, PERF_TEST_HEADER_VALUE } from '@/lib/quality-gates/perf-test';

const baseEnv = {
  PERF_TEST_MODE: 'true',
  NODE_ENV: 'development',
};

test('isPerfTestModeEnabled returns false in production', () => {
  expect(isPerfTestModeEnabled({ ...baseEnv, NODE_ENV: 'production' })).toBe(false);
});

test('isPerfTestModeEnabled requires PERF_TEST_MODE', () => {
  expect(isPerfTestModeEnabled({ NODE_ENV: 'development' })).toBe(false);
});

test('isPerfTestRequest requires header and mode', () => {
  const headers = new Headers({ [PERF_TEST_HEADER]: PERF_TEST_HEADER_VALUE });
  expect(isPerfTestRequest({ headers }, baseEnv)).toBe(true);
});

test('isPerfTestRequest rejects missing header', () => {
  const headers = new Headers();
  expect(isPerfTestRequest({ headers }, baseEnv)).toBe(false);
});
