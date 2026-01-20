export type A11yImpact = 'critical' | 'serious' | 'moderate' | 'minor' | null;

export type A11ySeverity = 'critical' | 'serious';

export type A11yViolation = {
  id: string;
  impact: A11ySeverity;
};

export type A11yBaseline = {
  generatedAt: string;
  baseUrl: string;
  pages: Record<string, A11yViolation[]>;
};

export type A11yRegression = {
  path: string;
  newViolations: A11yViolation[];
};

export type A11yComparison = {
  regressions: A11yRegression[];
  missing: string[];
};

export type AxeViolation = {
  id: string;
  impact?: A11yImpact;
};

export type AxeResults = {
  violations?: AxeViolation[];
};

const IMPACT_PRIORITY: Record<A11ySeverity, number> = {
  critical: 2,
  serious: 1,
};

function isSeverity(impact: A11yImpact): impact is A11ySeverity {
  return impact === 'critical' || impact === 'serious';
}

export function extractA11yViolations(results: AxeResults): A11yViolation[] {
  const byId = new Map<string, A11ySeverity>();

  for (const violation of results.violations ?? []) {
    const impact = violation.impact ?? null;
    if (!isSeverity(impact)) {
      continue;
    }

    const existing = byId.get(violation.id);
    if (!existing || IMPACT_PRIORITY[impact] > IMPACT_PRIORITY[existing]) {
      byId.set(violation.id, impact);
    }
  }

  return Array.from(byId.entries())
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(([id, impact]) => ({ id, impact }));
}

export function compareA11yBaselines(
  baseline: A11yBaseline,
  current: A11yBaseline
): A11yComparison {
  const regressions: A11yRegression[] = [];
  const missing: string[] = [];

  for (const [path, baselineViolations] of Object.entries(baseline.pages)) {
    const currentViolations = current.pages[path];
    if (!currentViolations) {
      missing.push(path);
      continue;
    }

    const baselineById = new Map<string, A11ySeverity>();
    for (const violation of baselineViolations) {
      baselineById.set(violation.id, violation.impact);
    }

    const newViolations = currentViolations
      .filter((violation) => {
        const baselineImpact = baselineById.get(violation.id);
        if (!baselineImpact) {
          return true;
        }
        return IMPACT_PRIORITY[violation.impact] > IMPACT_PRIORITY[baselineImpact];
      })
      .sort((left, right) => left.id.localeCompare(right.id));

    if (newViolations.length > 0) {
      regressions.push({ path, newViolations });
    }
  }

  return { regressions, missing };
}
