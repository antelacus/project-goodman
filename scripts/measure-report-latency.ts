/**
 * Report generation latency (REQ §6.2, TD-024).
 *
 *   npx tsx scripts/measure-report-latency.ts <out-dir> [runs=5]
 *
 * Runs the report workflow on the real financial data through the real relay,
 * 2024 against 2023 with every section, as the production reports were made.
 * The workflow itself writes nothing (saving is the route's job), so the run
 * leaves the shared database as it was; the reports row count is checked
 * before and after to prove it. Writes <out-dir>/report-latency.json.
 *
 * Credentials as in eval-retrieval.ts. Not part of CI.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.scripts', override: true, quiet: true });
// The app's server client reads the anon variable; the script reads as service_role.
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.REDIS_DISABLED = 'true';

async function main(outDir: string, runs: number) {
  const { reportWorkflowGraph, createInitialState } = await import('@/lib/workflows/report');
  const { createServerSupabaseClient } = await import('@/lib/database');

  const db = createServerSupabaseClient();
  const countReports = async () => {
    const { count, error } = await db.from('reports').select('id', { count: 'exact', head: true });
    if (error) throw new Error(`row count failed: ${error.message}`);
    return count;
  };

  const before = await countReports();
  const results = [];
  for (let i = 1; i <= runs; i++) {
    const started = Date.now();
    let error: string | undefined;
    let failedSections: string[] = [];
    let summaryStatus: string | undefined;
    try {
      const state = await reportWorkflowGraph.invoke(
        createInitialState({ year: '2024', comparisonYear: '2023', ownerId: 'latency-measure', ownerType: 'admin' })
      );
      failedSections = (state.report?.sections ?? [])
        .filter((s: { analysisStatus?: string }) => s.analysisStatus === 'failed')
        .map((s: { id: string }) => s.id);
      summaryStatus = state.report?.summary?.status;
      if (!state.report) error = 'no report produced';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const seconds = Math.round((Date.now() - started) / 100) / 10;
    results.push({ run: i, seconds, failedSections, summaryStatus, error });
    console.log(`run ${i}  ${String(seconds).padStart(6)}s  summary:${summaryStatus ?? '-'}  failed sections:${failedSections.join(',') || 'none'}${error ? `  ERROR ${error}` : ''}`);
  }

  const after = await countReports();
  const durations = results.map(r => r.seconds).sort((a, b) => a - b);
  const pct = (p: number) => durations[Math.min(durations.length - 1, Math.ceil(p * durations.length) - 1)];
  const summary = {
    runs,
    p50Seconds: pct(0.5),
    p95Seconds: pct(0.95),
    maxSeconds: durations[durations.length - 1],
    runsWithFailedSections: results.filter(r => r.failedSections.length > 0 || r.error).length,
    databaseUnchanged: before === after,
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'report-latency.json'), JSON.stringify({ ranAt: new Date().toISOString(), summary, results }, null, 1));
  console.log('\n' + JSON.stringify(summary, null, 1));
}

const [outDir, runsArg] = process.argv.slice(2);
if (!outDir) {
  console.error('usage: measure-report-latency.ts <out-dir> [runs=5]');
  process.exit(1);
}
main(outDir, runsArg ? Number(runsArg) : 5).catch(e => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
