// @vitest-environment node
import {
  evaluateAuditGate,
  parseAuditAllowlistJson,
  parseAuditReportJson,
} from '@/lib/quality-gates/audit-metrics';

test('parseAuditReportJson extracts high/critical findings', () => {
  const report = {
    auditReportVersion: 2,
    vulnerabilities: {
      foo: {
        name: 'foo',
        severity: 'high',
        via: [
          {
            source: 100,
            severity: 'high',
            title: 'Foo vuln',
            url: 'https://example.com/foo',
          },
        ],
      },
      bar: {
        name: 'bar',
        severity: 'critical',
        via: ['baz'],
      },
      low: {
        name: 'low',
        severity: 'low',
        via: [
          {
            source: 200,
            severity: 'low',
            title: 'Low vuln',
            url: 'https://example.com/low',
          },
        ],
      },
    },
  };

  const result = parseAuditReportJson(JSON.stringify(report));

  expect(result.errors).toEqual([]);
  expect(result.findings).toEqual([
    {
      package: 'bar',
      advisoryId: 'unknown',
      severity: 'critical',
    },
    {
      package: 'foo',
      advisoryId: '100',
      severity: 'high',
      title: 'Foo vuln',
      url: 'https://example.com/foo',
    },
  ]);
});

test('parseAuditAllowlistJson rejects invalid entries', () => {
  const allowlist = {
    entries: [
      {
        package: 'foo',
        advisoryId: '100',
        severity: 'high',
        reason: 'Blocked upstream fix.',
        expiresOn: '2026-02-01',
        fixPlan: 'Upgrade foo when 2.0.1 ships.',
      },
      {
        package: 'bad',
        advisoryId: '',
        severity: 'high',
        reason: '',
        expiresOn: 'invalid-date',
        fixPlan: '',
      },
    ],
  };

  const result = parseAuditAllowlistJson(JSON.stringify(allowlist));

  expect(result.entries).toEqual([
    {
      package: 'foo',
      advisoryId: '100',
      severity: 'high',
      reason: 'Blocked upstream fix.',
      expiresOn: '2026-02-01',
      fixPlan: 'Upgrade foo when 2.0.1 ships.',
    },
  ]);
  expect(result.errors).toEqual([expect.stringContaining('entries[1]')]);
});

test('evaluateAuditGate allows active allowlist entries and blocks expired ones', () => {
  const findings = [
    {
      package: 'foo',
      advisoryId: '100',
      severity: 'high',
    },
    {
      package: 'bar',
      advisoryId: '200',
      severity: 'critical',
    },
  ];

  const allowlistEntries = [
    {
      package: 'foo',
      advisoryId: '100',
      severity: 'high',
      reason: 'Blocked upstream fix.',
      expiresOn: '2026-02-01',
      fixPlan: 'Upgrade foo when 2.0.1 ships.',
    },
    {
      package: 'bar',
      advisoryId: '200',
      severity: 'critical',
      reason: 'Waiting on vendor patch.',
      expiresOn: '2026-01-01',
      fixPlan: 'Apply patch release once available.',
    },
  ];

  const evaluation = evaluateAuditGate(findings, allowlistEntries, new Date('2026-01-15T00:00:00Z'));

  expect(evaluation.allowed).toEqual([
    {
      package: 'foo',
      advisoryId: '100',
      severity: 'high',
    },
  ]);
  expect(evaluation.blocked).toEqual([
    {
      package: 'bar',
      advisoryId: '200',
      severity: 'critical',
    },
  ]);
  expect(evaluation.expiredAllowlist).toEqual([
    {
      package: 'bar',
      advisoryId: '200',
      severity: 'critical',
      reason: 'Waiting on vendor patch.',
      expiresOn: '2026-01-01',
      fixPlan: 'Apply patch release once available.',
    },
  ]);
});
