import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import dotenv from 'dotenv';
import {
  evaluateAuditGate,
  parseAuditAllowlistJson,
  parseAuditReportJson,
  type AuditAllowlistEntry,
  type AuditFinding,
} from '../../src/lib/quality-gates/audit-metrics';

dotenv.config({ path: '.env.local' });

const ALLOWLIST_PATH = process.env.AUDIT_ALLOWLIST_PATH
  ?? path.join(process.cwd(), 'tests/quality-baselines/audit/audit-allowlist.json');
const STRICT_MODE = process.env.QUALITY_GATES_STRICT !== 'false';

function readAllowlist(filePath: string): { entries: AuditAllowlistEntry[]; errors: string[] } {
  if (!fs.existsSync(filePath)) {
    return { entries: [], errors: [] };
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  return parseAuditAllowlistJson(raw);
}

function runNpmAudit(): string {
  const result = spawnSync('npm', ['audit', '--json'], {
    encoding: 'utf-8',
    env: process.env,
  });

  const output = result.stdout?.trim() ?? '';
  if (!output) {
    const stderr = result.stderr?.trim();
    throw new Error(stderr ? `npm audit returned no JSON output. ${stderr}` : 'npm audit returned no JSON output.');
  }

  return output;
}

function formatFinding(finding: AuditFinding): string {
  const parts = [
    finding.package,
    `advisory=${finding.advisoryId}`,
    `severity=${finding.severity}`,
  ];
  if (finding.title) {
    parts.push(`title=${finding.title}`);
  }
  if (finding.url) {
    parts.push(`url=${finding.url}`);
  }
  return parts.join(' ');
}

function logAllowlistEntry(entry: AuditAllowlistEntry): string {
  return `${entry.package} advisory=${entry.advisoryId} severity=${entry.severity} expiresOn=${entry.expiresOn}`;
}

async function run(): Promise<void> {
  console.log(`Audit allowlist path: ${ALLOWLIST_PATH}`);

  const allowlistResult = readAllowlist(ALLOWLIST_PATH);
  if (allowlistResult.errors.length > 0) {
    console.error('Audit allowlist errors:');
    for (const error of allowlistResult.errors) {
      console.error(error);
    }
    throw new Error('Audit allowlist validation failed.');
  }

  const auditJson = runNpmAudit();
  const auditResult = parseAuditReportJson(auditJson);

  if (auditResult.errors.length > 0) {
    console.error('npm audit parsing errors:');
    for (const error of auditResult.errors) {
      console.error(error);
    }
    throw new Error('npm audit report invalid.');
  }

  const evaluation = evaluateAuditGate(auditResult.findings, allowlistResult.entries, new Date());

  if (evaluation.expiredAllowlist.length > 0) {
    console.error('Expired allowlist entries (must be updated or removed):');
    for (const entry of evaluation.expiredAllowlist) {
      console.error(logAllowlistEntry(entry));
    }
  }

  if (evaluation.allowed.length > 0) {
    console.log('Allowlisted vulnerabilities:');
    for (const finding of evaluation.allowed) {
      console.log(formatFinding(finding));
    }
  }

  if (evaluation.unmatchedAllowlist.length > 0) {
    console.error('Allowlist entries matching no finding (remove them):');
    for (const entry of evaluation.unmatchedAllowlist) {
      console.error(logAllowlistEntry(entry));
    }
  }

  if (evaluation.blocked.length > 0) {
    console.error('High/Critical vulnerabilities found:');
    for (const finding of evaluation.blocked) {
      console.error(formatFinding(finding));
    }
  }

  if (evaluation.blocked.length > 0 || evaluation.unmatchedAllowlist.length > 0) {
    if (STRICT_MODE) {
      throw new Error('Audit gate failed.');
    }

    console.warn('Audit gate failed but STRICT mode is disabled.');
    return;
  }

  console.log(
    `Audit gate passed: blocked 0 / allowlisted ${evaluation.allowed.length} `
      + `(allowlist entries: ${allowlistResult.entries.length}).`
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
