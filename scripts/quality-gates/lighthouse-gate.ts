import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {
  compareLighthouseScores,
  DEFAULT_LIGHTHOUSE_THRESHOLDS,
  extractLighthousePath,
  extractLighthouseScores,
  type LighthouseScoreSet,
} from '../../src/lib/quality-gates/lighthouse-metrics';

dotenv.config({ path: '.env.local' });

const MODE = process.argv[2] ?? 'check';
const BASELINE_DIR = process.env.LHCI_BASELINE_DIR
  ?? path.join(process.cwd(), 'tests/quality-baselines/lighthouse');
const CURRENT_DIR = process.env.LHCI_CURRENT_DIR
  ?? path.join(process.cwd(), '.lighthouseci');
const STRICT_MODE = process.env.QUALITY_GATES_STRICT !== 'false';

// lhci 0.16 appends a random suffix (lhr-<time>-<n>.json); the committed baselines predate it.
const LHR_JSON_REGEX = /^lhr-\d+(?:-\d+)?\.json$/;
const LHR_HTML_REGEX = /^lhr-\d+(?:-\d+)?\.html$/;

function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function listReportFiles(dirPath: string, regex: RegExp): string[] {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Report directory not found: ${dirPath}`);
  }

  return fs.readdirSync(dirPath).filter((file) => regex.test(file));
}

function readScoreSet(dirPath: string): LighthouseScoreSet {
  const files = listReportFiles(dirPath, LHR_JSON_REGEX);

  if (files.length === 0) {
    throw new Error(`No Lighthouse JSON reports found in ${dirPath}.`);
  }

  const scores: LighthouseScoreSet = {};

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const report = JSON.parse(raw);
    const reportPath = extractLighthousePath(report);

    if (scores[reportPath]) {
      throw new Error(`Duplicate Lighthouse report for path ${reportPath}.`);
    }

    scores[reportPath] = extractLighthouseScores(report);
  }

  return scores;
}

function clearBaseline(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  for (const file of fs.readdirSync(dirPath)) {
    if (!LHR_JSON_REGEX.test(file) && !LHR_HTML_REGEX.test(file)) {
      continue;
    }
    fs.unlinkSync(path.join(dirPath, file));
  }
}

function copyReports(sourceDir: string, targetDir: string): void {
  ensureDirectory(targetDir);
  clearBaseline(targetDir);

  const jsonFiles = listReportFiles(sourceDir, LHR_JSON_REGEX);

  if (jsonFiles.length === 0) {
    throw new Error(`No Lighthouse JSON reports found in ${sourceDir}.`);
  }

  for (const jsonFile of jsonFiles) {
    const htmlFile = jsonFile.replace('.json', '.html');
    fs.copyFileSync(path.join(sourceDir, jsonFile), path.join(targetDir, jsonFile));
    if (fs.existsSync(path.join(sourceDir, htmlFile))) {
      fs.copyFileSync(path.join(sourceDir, htmlFile), path.join(targetDir, htmlFile));
    } else {
      console.warn(`Missing HTML report for ${jsonFile}.`);
    }
  }
}

async function run(): Promise<void> {
  if (MODE !== 'baseline' && MODE !== 'check') {
    throw new Error('Usage: tsx scripts/quality-gates/lighthouse-gate.ts <baseline|check>');
  }

  console.log(`Lighthouse gate mode: ${MODE}`);
  console.log(`Baseline dir: ${BASELINE_DIR}`);
  console.log(`Current dir: ${CURRENT_DIR}`);

  if (MODE === 'baseline') {
    copyReports(CURRENT_DIR, BASELINE_DIR);
    console.log(`Baseline reports copied to ${BASELINE_DIR}`);
    return;
  }

  if (!fs.existsSync(BASELINE_DIR)) {
    throw new Error(`Baseline directory not found at ${BASELINE_DIR}. Run baseline mode first.`);
  }

  const baselineScores = readScoreSet(BASELINE_DIR);
  const currentScores = readScoreSet(CURRENT_DIR);
  const comparison = compareLighthouseScores(
    baselineScores,
    currentScores,
    DEFAULT_LIGHTHOUSE_THRESHOLDS
  );

  if (comparison.missing.length > 0) {
    console.error(`Missing Lighthouse reports for paths: ${comparison.missing.join(', ')}`);
  }

  if (comparison.regressions.length > 0) {
    console.error('Lighthouse regressions detected:');
    for (const regression of comparison.regressions) {
      console.error(
        `${regression.path} ${regression.category} current=${regression.current} baseline=${regression.baseline} allowed>=${regression.allowed}`
      );
    }
  }

  if (comparison.missing.length > 0 || comparison.regressions.length > 0) {
    if (STRICT_MODE) {
      throw new Error('Lighthouse gate failed.');
    }
    console.warn('Lighthouse gate failed but STRICT mode is disabled.');
    return;
  }

  console.log('Lighthouse gate passed.');
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
