export type A11yImpact = 'critical' | 'serious' | 'moderate' | 'minor' | null;

export type A11ySeverity = 'critical' | 'serious';

export type A11yViolation = {
  id: string;
  impact: A11ySeverity;
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
