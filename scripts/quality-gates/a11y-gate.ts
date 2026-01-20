import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { extractA11yViolations } from '../../src/lib/quality-gates/a11y-metrics';

dotenv.config({ path: '.env.local' });

const MODE = process.argv[2] ?? 'scan';
const BASE_URL = process.env.A11Y_BASE_URL ?? 'http://localhost:3000';
const RESULTS_PATH = process.env.A11Y_RESULTS_PATH
  ?? path.join(process.cwd(), '.a11y', 'a11y-results.json');

const PAGES = ['/', '/chat'];

type A11ySnapshot = {
  generatedAt: string;
  baseUrl: string;
  pages: Record<string, ReturnType<typeof extractA11yViolations>>;
};

function ensureDirectory(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function runScan(): Promise<A11ySnapshot> {
  const pages: A11ySnapshot['pages'] = {};
  const browser = await chromium.launch();

  try {
    for (const pagePath of PAGES) {
      const url = new URL(pagePath, BASE_URL).toString();
      console.log(`Scanning ${url}...`);
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'networkidle' });
        const results = await new AxeBuilder({ page }).analyze();
        pages[pagePath] = extractA11yViolations(results);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  return {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    pages,
  };
}

async function run(): Promise<void> {
  if (MODE !== 'scan') {
    throw new Error('Usage: tsx scripts/quality-gates/a11y-gate.ts scan');
  }

  console.log(`A11y scan mode: ${MODE}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Results path: ${RESULTS_PATH}`);

  const snapshot = await runScan();
  ensureDirectory(RESULTS_PATH);
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(snapshot, null, 2));
  console.log(`A11y results written to ${RESULTS_PATH}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
