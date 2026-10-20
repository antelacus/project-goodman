// @vitest-environment node
import fs from 'fs';
import path from 'path';

// DESIGN §7: the AI SDK is imported only inside src/lib/ai/, so the rules that
// live there (model, parameters, system prompt, failure detection) cannot be
// bypassed by a call site.
function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe('AI SDK boundary', () => {
  it('imports the openai package only inside src/lib/ai/', () => {
    const src = path.join(process.cwd(), 'src');
    const aiDir = path.join(src, 'lib', 'ai') + path.sep;
    const offenders = sourceFiles(src)
      .filter(file => !file.startsWith(aiDir))
      .filter(file => /from\s+['"]openai(\/[^'"]*)?['"]|require\(\s*['"]openai/.test(fs.readFileSync(file, 'utf8')))
      .map(file => path.relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });
});
