export type PerfScenarioMetrics = {
  name: string;
  method: string;
  path: string;
  latencyMs: {
    p50: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
};

export type PerfBaseline = {
  generatedAt: string;
  baseUrl: string;
  scenarios: Record<string, PerfScenarioMetrics>;
};

export type PerfRegression = {
  scenario: string;
  metric: 'p95' | 'errorRate';
  baseline: number;
  current: number;
  allowed: number;
};

export type PerfComparison = {
  regressions: PerfRegression[];
  missing: string[];
};

export type PerfThresholds = {
  latencyP95RegressionRatio: number;
  errorRateRegressionRatio: number;
};

export const DEFAULT_PERF_THRESHOLDS: PerfThresholds = {
  latencyP95RegressionRatio: 0.2,
  errorRateRegressionRatio: 0.2,
};

export function comparePerfBaselines(
  baseline: PerfBaseline,
  current: PerfBaseline,
  thresholds: PerfThresholds = DEFAULT_PERF_THRESHOLDS
): PerfComparison {
  const regressions: PerfRegression[] = [];
  const missing: string[] = [];

  for (const [scenarioName, baselineScenario] of Object.entries(baseline.scenarios)) {
    const currentScenario = current.scenarios[scenarioName];
    if (!currentScenario) {
      missing.push(scenarioName);
      continue;
    }

    const allowedP95 = baselineScenario.latencyMs.p95 * (1 + thresholds.latencyP95RegressionRatio);
    if (currentScenario.latencyMs.p95 > allowedP95) {
      regressions.push({
        scenario: scenarioName,
        metric: 'p95',
        baseline: baselineScenario.latencyMs.p95,
        current: currentScenario.latencyMs.p95,
        allowed: allowedP95,
      });
    }

    const allowedErrorRate = baselineScenario.errorRate * (1 + thresholds.errorRateRegressionRatio);
    if (currentScenario.errorRate > allowedErrorRate) {
      regressions.push({
        scenario: scenarioName,
        metric: 'errorRate',
        baseline: baselineScenario.errorRate,
        current: currentScenario.errorRate,
        allowed: allowedErrorRate,
      });
    }
  }

  return { regressions, missing };
}
