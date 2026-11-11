// @vitest-environment node
// Acceptance tests for docs/features/public-readiness/REQ.md §5.3 (batch B7), over the
// files git tracks: what the public repository shows.

import fs from 'fs';
import { execFileSync } from 'child_process';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(f => f && fs.existsSync(f));
const text = (file: string) => {
  const bytes = fs.readFileSync(file);
  return bytes.includes(0) ? null : bytes.toString('utf8');
};
const offending = (pattern: RegExp) =>
  tracked.flatMap(file => {
    const content = text(file);
    return content && pattern.test(content) ? [file] : [];
  });

describe('B7 public content', () => {
  it('§no-license there is no LICENSE file, package.json says UNLICENSED and README states all rights reserved', () => {
    expect(tracked.filter(f => /^LICEN[CS]E/i.test(f))).toEqual([]);
    expect(JSON.parse(fs.readFileSync('package.json', 'utf8')).license).toBe('UNLICENSED');
    expect(fs.readFileSync('README.md', 'utf8')).toContain('保留所有权利');
  });

  it('§no-internals no tracked file contains an absolute path under /home/', () => {
    expect(offending(/\/home\/[A-Za-z0-9._-]/)).toEqual([]);
  });

  it('§no-personal-email no tracked file contains a personal email address; the security contact is GitHub private vulnerability reporting', () => {
    expect(offending(/[A-Za-z0-9._%+-]+@(gmail|qq|163|126|outlook|hotmail|yahoo|icloud|foxmail)\.com/i)).toEqual([]);
    expect(fs.readFileSync('docs/SECURITY.md', 'utf8')).toContain('Report a vulnerability');
  });
});
