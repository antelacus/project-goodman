import 'server-only';
import { PERF_TEST_HEADER, PERF_TEST_HEADER_VALUE } from './perf-test-constants';

if (typeof window !== 'undefined') {
  throw new Error('[SECURITY] perf-test.ts must not be imported in client-side code.');
}

export { PERF_TEST_HEADER, PERF_TEST_HEADER_VALUE };

export type PerfTestRequest = {
  headers: Headers;
};

export function isPerfTestModeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PERF_TEST_MODE === 'true' && env.NODE_ENV !== 'production';
}

export function isPerfTestRequest(
  request: PerfTestRequest,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (!isPerfTestModeEnabled(env)) {
    return false;
  }

  return request.headers.get(PERF_TEST_HEADER) === PERF_TEST_HEADER_VALUE;
}
