export type LighthouseCategory = 'performance' | 'accessibility';

export type LighthouseScores = Record<LighthouseCategory, number>;

export type LighthouseScoreSet = Record<string, LighthouseScores>;

export type LighthouseRegression = {
  path: string;
  category: LighthouseCategory;
  baseline: number;
  current: number;
  allowed: number;
};

export type LighthouseComparison = {
  regressions: LighthouseRegression[];
  missing: string[];
};

export type LighthouseThresholds = {
  maxScoreDrop: number;
};

export const DEFAULT_LIGHTHOUSE_THRESHOLDS: LighthouseThresholds = {
  maxScoreDrop: 5,
};

export type LighthouseReport = {
  requestedUrl?: string;
  finalUrl?: string;
  categories?: {
    performance?: { score?: number | null };
    accessibility?: { score?: number | null };
  };
};

function toScore(value: number | null | undefined, category: LighthouseCategory): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Lighthouse score missing for ${category}.`);
  }
  return Math.round(value * 100);
}

export function extractLighthouseScores(report: LighthouseReport): LighthouseScores {
  return {
    performance: toScore(report.categories?.performance?.score, 'performance'),
    accessibility: toScore(report.categories?.accessibility?.score, 'accessibility'),
  };
}

export function extractLighthousePath(report: LighthouseReport): string {
  const url = report.requestedUrl ?? report.finalUrl;
  if (!url) {
    throw new Error('Lighthouse report missing requestedUrl/finalUrl.');
  }

  try {
    return new URL(url).pathname;
  } catch (error) {
    throw new Error(`Invalid Lighthouse URL: ${url}`);
  }
}

export function compareLighthouseScores(
  baseline: LighthouseScoreSet,
  current: LighthouseScoreSet,
  thresholds: LighthouseThresholds = DEFAULT_LIGHTHOUSE_THRESHOLDS
): LighthouseComparison {
  const regressions: LighthouseRegression[] = [];
  const missing: string[] = [];

  for (const [path, baselineScores] of Object.entries(baseline)) {
    const currentScores = current[path];
    if (!currentScores) {
      missing.push(path);
      continue;
    }

    for (const category of Object.keys(baselineScores) as LighthouseCategory[]) {
      const baselineScore = baselineScores[category];
      const currentScore = currentScores[category];
      const allowed = baselineScore - thresholds.maxScoreDrop;

      if (currentScore < allowed) {
        regressions.push({
          path,
          category,
          baseline: baselineScore,
          current: currentScore,
          allowed,
        });
      }
    }
  }

  return { regressions, missing };
}
