export type AuditSeverity = 'high' | 'critical';

export type AuditFinding = {
  package: string;
  advisoryId: string;
  severity: AuditSeverity;
  title?: string;
  url?: string;
};

export type AuditAllowlistEntry = {
  package: string;
  advisoryId: string;
  severity: AuditSeverity;
  reason: string;
  expiresOn: string;
  fixPlan: string;
};

export type AuditAllowlistParseResult = {
  entries: AuditAllowlistEntry[];
  errors: string[];
};

export type AuditReportParseResult = {
  findings: AuditFinding[];
  errors: string[];
};

export type AuditGateEvaluation = {
  allowed: AuditFinding[];
  blocked: AuditFinding[];
  expiredAllowlist: AuditAllowlistEntry[];
};

type AuditVia = {
  source?: number | string;
  severity?: string;
  title?: string;
  url?: string;
};

type AuditVulnerability = {
  name?: string;
  severity?: string;
  via?: Array<string | AuditVia>;
};

type AuditReport = {
  auditReportVersion?: number;
  vulnerabilities?: Record<string, AuditVulnerability>;
  error?: {
    summary?: string;
    detail?: string;
  };
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeSeverity(value: unknown): AuditSeverity | null {
  return value === 'high' || value === 'critical' ? value : null;
}

function parseExpiryDate(value: string): Date | null {
  if (!DATE_REGEX.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T23:59:59Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function getNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function auditKey(packageName: string, advisoryId: string, severity: AuditSeverity): string {
  return `${packageName}::${advisoryId}::${severity}`;
}

function extractAuditFindings(report: AuditReport): AuditFinding[] {
  const findings = new Map<string, AuditFinding>();
  const vulnerabilities = report.vulnerabilities ?? {};

  for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
    const severity = normalizeSeverity(vulnerability.severity);
    if (!severity) {
      continue;
    }

    const viaEntries = Array.isArray(vulnerability.via) ? vulnerability.via : [];
    let collected = false;

    for (const via of viaEntries) {
      if (typeof via === 'string') {
        continue;
      }
      if (!isRecord(via)) {
        continue;
      }
      const viaSeverity = normalizeSeverity(via.severity) ?? severity;
      if (!viaSeverity) {
        continue;
      }
      const advisoryId = via.source !== undefined && via.source !== null ? String(via.source) : 'unknown';
      const key = auditKey(packageName, advisoryId, viaSeverity);

      if (!findings.has(key)) {
        findings.set(key, {
          package: packageName,
          advisoryId,
          severity: viaSeverity,
          title: typeof via.title === 'string' ? via.title : undefined,
          url: typeof via.url === 'string' ? via.url : undefined,
        });
      }
      collected = true;
    }

    if (!collected) {
      const key = auditKey(packageName, 'unknown', severity);
      if (!findings.has(key)) {
        findings.set(key, {
          package: packageName,
          advisoryId: 'unknown',
          severity,
        });
      }
    }
  }

  return Array.from(findings.values()).sort((left, right) => {
    const packageCompare = left.package.localeCompare(right.package);
    if (packageCompare !== 0) {
      return packageCompare;
    }
    const advisoryCompare = left.advisoryId.localeCompare(right.advisoryId);
    if (advisoryCompare !== 0) {
      return advisoryCompare;
    }
    return left.severity.localeCompare(right.severity);
  });
}

export function parseAuditReportJson(raw: string): AuditReportParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    return {
      findings: [],
      errors: [
        `Failed to parse npm audit JSON: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  if (!isRecord(parsed)) {
    return {
      findings: [],
      errors: ['npm audit JSON is not an object.'],
    };
  }

  const report = parsed as AuditReport;
  if (report.error) {
    const summary = report.error.summary ?? 'npm audit reported an error.';
    const detail = report.error.detail ?? '';
    return {
      findings: [],
      errors: [detail ? `${summary} ${detail}` : summary],
    };
  }

  if (report.vulnerabilities && !isRecord(report.vulnerabilities)) {
    return {
      findings: [],
      errors: ['npm audit JSON vulnerabilities field is invalid.'],
    };
  }

  return {
    findings: extractAuditFindings(report),
    errors: [],
  };
}

export function parseAuditAllowlistJson(raw: string): AuditAllowlistParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    return {
      entries: [],
      errors: [
        `Failed to parse audit allowlist JSON: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  if (!isRecord(parsed)) {
    return {
      entries: [],
      errors: ['Audit allowlist JSON is not an object.'],
    };
  }

  const entriesValue = parsed.entries;
  if (!Array.isArray(entriesValue)) {
    return {
      entries: [],
      errors: ['Audit allowlist JSON must include an entries array.'],
    };
  }

  const entries: AuditAllowlistEntry[] = [];
  const errors: string[] = [];

  entriesValue.forEach((entryValue, index) => {
    if (!isRecord(entryValue)) {
      errors.push(`entries[${index}] is not an object.`);
      return;
    }

    const packageName = getNonEmptyString(entryValue.package);
    const advisoryId = getNonEmptyString(entryValue.advisoryId);
    const severity = normalizeSeverity(entryValue.severity);
    const reason = getNonEmptyString(entryValue.reason);
    const expiresOn = getNonEmptyString(entryValue.expiresOn);
    const fixPlan = getNonEmptyString(entryValue.fixPlan);

    const entryErrors: string[] = [];

    if (!packageName) {
      entryErrors.push('package is required');
    }
    if (!advisoryId) {
      entryErrors.push('advisoryId is required');
    }
    if (!severity) {
      entryErrors.push('severity must be high or critical');
    }
    if (!reason) {
      entryErrors.push('reason is required');
    }
    if (!expiresOn) {
      entryErrors.push('expiresOn is required');
    }
    if (!fixPlan) {
      entryErrors.push('fixPlan is required');
    }

    const expiryDate = expiresOn ? parseExpiryDate(expiresOn) : null;
    if (expiresOn && !expiryDate) {
      entryErrors.push('expiresOn must be YYYY-MM-DD');
    }

    if (
      !packageName
      || !advisoryId
      || !severity
      || !reason
      || !expiresOn
      || !fixPlan
      || !expiryDate
    ) {
      errors.push(`entries[${index}] invalid: ${entryErrors.join(', ')}`);
      return;
    }

    entries.push({
      package: packageName,
      advisoryId,
      severity,
      reason,
      expiresOn,
      fixPlan,
    });
  });

  return { entries, errors };
}

export function evaluateAuditGate(
  findings: AuditFinding[],
  allowlistEntries: AuditAllowlistEntry[],
  now: Date = new Date()
): AuditGateEvaluation {
  const allowlistIndex = new Map<string, AuditAllowlistEntry>();
  for (const entry of allowlistEntries) {
    const key = auditKey(entry.package, entry.advisoryId, entry.severity);
    if (!allowlistIndex.has(key)) {
      allowlistIndex.set(key, entry);
    }
  }

  const allowed: AuditFinding[] = [];
  const blocked: AuditFinding[] = [];
  const expiredAllowlist: AuditAllowlistEntry[] = [];
  const expiredKeys = new Set<string>();

  for (const finding of findings) {
    const key = auditKey(finding.package, finding.advisoryId, finding.severity);
    const allowlistEntry = allowlistIndex.get(key);

    if (!allowlistEntry) {
      blocked.push(finding);
      continue;
    }

    const expiryDate = parseExpiryDate(allowlistEntry.expiresOn);
    const isExpired = !expiryDate || expiryDate.getTime() < now.getTime();

    if (isExpired) {
      blocked.push(finding);
      if (!expiredKeys.has(key)) {
        expiredAllowlist.push(allowlistEntry);
        expiredKeys.add(key);
      }
      continue;
    }

    allowed.push(finding);
  }

  return { allowed, blocked, expiredAllowlist };
}
