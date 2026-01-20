import fs from 'fs';
import path from 'path';
import autocannon from 'autocannon';
import dotenv from 'dotenv';
import {
  comparePerfBaselines,
  DEFAULT_PERF_THRESHOLDS,
  type PerfBaseline,
  type PerfScenarioMetrics,
} from '../../src/lib/quality-gates/perf-metrics';
import { PERF_TEST_HEADER, PERF_TEST_HEADER_VALUE } from '../../src/lib/quality-gates/perf-test-constants';

dotenv.config({ path: '.env.local' });

type ScenarioConfig = {
  name: string;
  method: 'POST';
  path: string;
  body: string;
  headers?: Record<string, string>;
};

type AutocannonSummary = {
  latency?: {
    p50?: number;
    p95?: number;
    p99?: number;
  };
  requests?: {
    total?: number;
  };
  errors?: number;
  timeouts?: number;
};

const MODE = process.argv[2] ?? 'check';
const BASE_URL = process.env.PERF_BASE_URL ?? 'http://localhost:3000';
const BASELINE_PATH = process.env.PERF_BASELINE_PATH
  ?? path.join(process.cwd(), 'tests/quality-baselines/performance/perf-baseline.json');
const CONNECTIONS = Number(process.env.PERF_CONNECTIONS ?? '1');
const DURATION_SECONDS = Number(process.env.PERF_DURATION_SECONDS ?? '10');
const TIMEOUT_SECONDS = Number(process.env.PERF_TIMEOUT_SECONDS ?? '10');
const OVERALL_RATE = Number(process.env.PERF_OVERALL_RATE ?? '1');
const MAX_OVERALL_REQUESTS = Number(process.env.PERF_MAX_OVERALL_REQUESTS ?? '5');
const STRICT_MODE = process.env.QUALITY_GATES_STRICT !== 'false';

const COMMON_HEADERS = {
  'content-type': 'application/json',
  [PERF_TEST_HEADER]: PERF_TEST_HEADER_VALUE,
};

const PERF_BODY = JSON.stringify({ perfTest: true });

const SCENARIOS: ScenarioConfig[] = [
  {
    name: 'chat.stream',
    method: 'POST',
    path: '/api/chat/stream',
    body: PERF_BODY,
    headers: {
      ...COMMON_HEADERS,
      accept: 'text/event-stream',
    },
  },
  {
    name: 'reports.generate',
    method: 'POST',
    path: '/api/reports/generate',
    body: PERF_BODY,
    headers: {
      ...COMMON_HEADERS,
      accept: 'text/event-stream',
    },
  },
  {
    name: 'documents.upload-temp',
    method: 'POST',
    path: '/api/documents/upload-temp',
    body: PERF_BODY,
    headers: COMMON_HEADERS,
  },
  {
    name: 'quick-actions.extract',
    method: 'POST',
    path: '/api/quick-actions/extract',
    body: PERF_BODY,
    headers: COMMON_HEADERS,
  },
];

function ensurePerfTestMode(): void {
  if (process.env.PERF_TEST_MODE !== 'true') {
    throw new Error('PERF_TEST_MODE must be set to "true" when running perf gates.');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('PERF_TEST_MODE is not allowed in production.');
  }
}

async function runScenario(baseUrl: string, scenario: ScenarioConfig): Promise<PerfScenarioMetrics> {
  const url = new URL(scenario.path, baseUrl).toString();

  const result = await new Promise<AutocannonSummary>((resolve, reject) => {
    autocannon(
      {
        url,
        method: scenario.method,
        body: scenario.body,
        headers: scenario.headers,
        connections: CONNECTIONS,
        duration: DURATION_SECONDS,
        timeout: TIMEOUT_SECONDS,
        overallRate: OVERALL_RATE,
        maxOverallRequests: MAX_OVERALL_REQUESTS,
        pipelining: 1,
      },
      (error, output) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(output as AutocannonSummary);
      }
    );
  });

  const totalRequests = result.requests?.total ?? 0;
  const errorCount = (result.errors ?? 0) + (result.timeouts ?? 0);
  const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

  if (totalRequests === 0) {
    throw new Error(`No successful responses for ${scenario.name}.`);
  }

  return {
    name: scenario.name,
    method: scenario.method,
    path: scenario.path,
    latencyMs: {
      p50: result.latency?.p50 ?? 0,
      p95: result.latency?.p95 ?? 0,
      p99: result.latency?.p99 ?? 0,
    },
    errorRate,
  };
}

async function warmUpScenario(baseUrl: string, scenario: ScenarioConfig): Promise<void> {
  const url = new URL(scenario.path, baseUrl).toString();
  const deadline = Date.now() + 300000;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(url, {
        method: scenario.method,
        headers: scenario.headers,
        body: scenario.body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      await response.arrayBuffer();
      if (!response.ok) {
        throw new Error(`Warm-up status ${response.status}`);
      }
      return;
    } catch (error) {
      clearTimeout(timeoutId);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (Date.now() >= deadline) {
        throw new Error(
          `Warm-up failed for ${scenario.name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }
}

async function collectBaseline(): Promise<PerfBaseline> {
  const scenarios: Record<string, PerfScenarioMetrics> = {};

  for (const scenario of SCENARIOS) {
    console.log(`Warming up ${scenario.name}...`);
    await warmUpScenario(BASE_URL, scenario);
    console.log(`Running ${scenario.name}...`);
    scenarios[scenario.name] = await runScenario(BASE_URL, scenario);
  }

  return {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    scenarios,
  };
}

function readBaseline(filePath: string): PerfBaseline {
  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw) as PerfBaseline;
  } catch (error) {
    throw new Error(`Failed to parse perf baseline JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function writeBaseline(filePath: string, baseline: PerfBaseline): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(baseline, null, 2));
}

async function run(): Promise<void> {
  ensurePerfTestMode();

  if (MODE !== 'baseline' && MODE !== 'check') {
    throw new Error('Usage: tsx scripts/quality-gates/perf-gate.ts <baseline|check>');
  }

  console.log(`Perf gate mode: ${MODE}`);
  console.log(`Target base URL: ${BASE_URL}`);
  console.log(
    `Connections: ${CONNECTIONS}, Duration: ${DURATION_SECONDS}s, Timeout: ${TIMEOUT_SECONDS}s, OverallRate: ${OVERALL_RATE}/s, MaxRequests: ${MAX_OVERALL_REQUESTS}`
  );

  const current = await collectBaseline();

  if (MODE === 'baseline') {
    writeBaseline(BASELINE_PATH, current);
    console.log(`Baseline written to ${BASELINE_PATH}`);
    return;
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(`Baseline file not found at ${BASELINE_PATH}. Run baseline mode first.`);
  }

  const baseline = readBaseline(BASELINE_PATH);
  const comparison = comparePerfBaselines(baseline, current, DEFAULT_PERF_THRESHOLDS);

  if (comparison.missing.length > 0) {
    console.error(`Missing scenarios in current run: ${comparison.missing.join(', ')}`);
  }

  if (comparison.regressions.length > 0) {
    console.error('Performance regressions detected:');
    for (const regression of comparison.regressions) {
      console.error(
        `${regression.scenario} ${regression.metric} current=${regression.current} baseline=${regression.baseline} allowed=${regression.allowed}`
      );
    }
  }

  if (comparison.missing.length > 0 || comparison.regressions.length > 0) {
    if (STRICT_MODE) {
      throw new Error('Perf gate failed.');
    }
    console.warn('Perf gate failed but STRICT mode is disabled.');
  } else {
    console.log('Perf gate passed.');
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
