import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  compareA11yBaselines,
  extractA11yViolations,
  type A11yBaseline,
} from '../../src/lib/quality-gates/a11y-metrics';

dotenv.config({ path: '.env.local' });

const MODE = process.argv[2] ?? 'check';
const BASE_URL = process.env.A11Y_BASE_URL ?? 'http://localhost:3000';
const BASELINE_PATH = process.env.A11Y_BASELINE_PATH
  ?? path.join(process.cwd(), 'tests/quality-baselines/a11y/a11y-baseline.json');
const RESULTS_PATH = process.env.A11Y_RESULTS_PATH
  ?? path.join(process.cwd(), '.a11y', 'a11y-results.json');
const STRICT_MODE = process.env.QUALITY_GATES_STRICT !== 'false';

const PAGES = ['/', '/chat'];

function ensureDirectory(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function runScan(): Promise<A11yBaseline> {
  const pages: A11yBaseline['pages'] = {};
  const browser = await chromium.launch();
  const context = await browser.newContext();

  try {
    for (const pagePath of PAGES) {
      const url = new URL(pagePath, BASE_URL).toString();
      console.log(`Scanning ${url}...`);
      const page = await context.newPage();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const results = await new AxeBuilder({ page }).analyze();
        pages[pagePath] = extractA11yViolations(results);
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  return {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    pages,
  };
}

function readBaseline(filePath: string): A11yBaseline {
  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw) as A11yBaseline;
  } catch (error) {
    throw new Error(`Failed to parse a11y baseline JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function writeSnapshot(filePath: string, snapshot: A11yBaseline): void {
  ensureDirectory(filePath);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
}

async function run(): Promise<void> {
  if (MODE !== 'baseline' && MODE !== 'check') {
    throw new Error('Usage: tsx scripts/quality-gates/a11y-gate.ts <baseline|check>');
  }

  console.log(`A11y scan mode: ${MODE}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Baseline path: ${BASELINE_PATH}`);
  console.log(`Results path: ${RESULTS_PATH}`);

  const snapshot = await runScan();
  writeSnapshot(RESULTS_PATH, snapshot);
  console.log(`A11y results written to ${RESULTS_PATH}`);

  if (MODE === 'baseline') {
    writeSnapshot(BASELINE_PATH, snapshot);
    console.log(`A11y baseline written to ${BASELINE_PATH}`);
    return;
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(`Baseline file not found at ${BASELINE_PATH}. Run baseline mode first.`);
  }

  const baseline = readBaseline(BASELINE_PATH);
  const comparison = compareA11yBaselines(baseline, snapshot);

  if (comparison.missing.length > 0) {
    console.error(`Missing a11y reports for paths: ${comparison.missing.join(', ')}`);
  }

  if (comparison.regressions.length > 0) {
    console.error('A11y regressions detected:');
    for (const regression of comparison.regressions) {
      const violations = regression.newViolations
        .map((violation) => `${violation.id}(${violation.impact})`)
        .join(', ');
      console.error(`${regression.path} new violations: ${violations}`);
    }
  }

  if (comparison.missing.length > 0 || comparison.regressions.length > 0) {
    if (STRICT_MODE) {
      throw new Error('A11y gate failed.');
    }
    console.warn('A11y gate failed but STRICT mode is disabled.');
    return;
  }

  console.log('A11y gate passed.');
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
