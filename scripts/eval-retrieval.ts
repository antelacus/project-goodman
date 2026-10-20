/**
 * Retrieval eval (REQ §retrieval-quality, the eval half of §out-of-library).
 *
 *   npx tsx scripts/eval-retrieval.ts <out-dir>
 *
 * Runs every question in scripts/eval-retrieval-queries.json through the full
 * agent (real search, real relay) with an in-memory conversation store, so the
 * run writes nothing to the shared database; the session and message counts are
 * checked before and after to prove it. Writes <out-dir>/eval.json with each
 * question's search trail, final answer, verdict and duration.
 *
 * Credentials: LLM_* from .env; the database from .env.scripts (see
 * resplit-regulations.ts). Not part of CI: it costs relay tokens and minutes.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.scripts', override: true, quiet: true });
// The app's server client reads the anon variable; the eval reads as service_role.
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.REDIS_DISABLED = 'true';

type Expected = { regulation: string; article: string } | { document: string };

interface Query {
  id: string;
  kind: 'regulation' | 'company' | 'out_of_library';
  style?: 'term' | 'colloquial';
  question: string;
  expected?: Expected[];
}

interface SearchRound {
  tool: string;
  keywords: unknown;
  status: string;
  top: string[];
}

interface ToolResultLike {
  toolCallId: string;
  toolName: string;
  result: { success: boolean; error?: string; data?: { status?: string; results?: Array<Record<string, string>> } };
}

const TOP = 5;
const ARTICLE_NUMBER = /第\s*[零〇一二三四五六七八九十百千\d]+\s*条/;

async function main(outDir: string) {
  const { createUnifiedGraph } = await import('@/lib/workflows/unified/graph');
  const { createInMemoryMemory } = await import('@/lib/memory/in-memory');
  const { OUT_OF_LIBRARY_LABEL, RETRIEVAL_FAILED_LABEL } = await import('@/lib/citations');
  const { createServerSupabaseClient } = await import('@/lib/database');

  const { queries } = JSON.parse(fs.readFileSync(path.join('scripts', 'eval-retrieval-queries.json'), 'utf8')) as { queries: Query[] };
  const db = createServerSupabaseClient();
  const countRows = async () => {
    const [s, m] = await Promise.all([
      db.from('conversation_sessions').select('id', { count: 'exact', head: true }),
      db.from('conversation_messages').select('id', { count: 'exact', head: true }),
    ]);
    if (s.error || m.error) throw new Error(`row count failed: ${(s.error ?? m.error)!.message}`);
    return { sessions: s.count, messages: m.count };
  };

  const before = await countRows();
  const results = [];

  for (const q of queries) {
    const started = Date.now();
    let answer = '';
    let rounds: SearchRound[] = [];
    let error: string | undefined;
    try {
      const graph = createUnifiedGraph({ memory: createInMemoryMemory() });
      const state = await graph.invoke({ input: { question: q.question } });
      answer = state.output.answer;
      const calls = new Map<string, unknown>(
        state.agent.messages
          .flatMap((m: { tool_calls?: Array<{ id: string; args: { keywords?: unknown } }> }) => m.tool_calls ?? [])
          .map((tc: { id: string; args: { keywords?: unknown } }) => [tc.id, tc.args.keywords])
      );
      rounds = (state.toolResults as ToolResultLike[])
        .filter(r => r.toolName === 'search_regulations' || r.toolName === 'search_documents')
        .map(r => ({
          tool: r.toolName,
          keywords: calls.get(r.toolCallId),
          status: r.result.success ? r.result.data?.status ?? 'ok' : 'error',
          top: (r.result.data?.results ?? []).slice(0, TOP).map(hit =>
            r.toolName === 'search_regulations' ? `${hit.regulationName} ${hit.articleNumber}` : hit.document
          ),
        }));
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    const seconds = Math.round((Date.now() - started) / 100) / 10;
    let pass: boolean;
    if (q.kind === 'out_of_library') {
      pass = !error && (answer.startsWith(OUT_OF_LIBRARY_LABEL) || answer.startsWith(RETRIEVAL_FAILED_LABEL)) && !ARTICLE_NUMBER.test(answer);
    } else {
      const wanted = (q.expected ?? []).map(e => ('document' in e ? e.document : `${e.regulation} ${e.article}`));
      pass = !error && rounds.some(r => r.top.some(t => wanted.includes(t)));
    }
    results.push({ ...q, pass, seconds, rounds, answer, error });
    console.log(`${pass ? 'PASS' : 'FAIL'} ${q.id.padEnd(17)} ${String(seconds).padStart(5)}s  ${rounds.map(r => `${r.tool === 'search_regulations' ? 'R' : 'D'}:${r.status}`).join(' ')}${error ? `  ERROR ${error}` : ''}`);
  }

  const after = await countRows();
  const inLibrary = results.filter(r => r.kind !== 'out_of_library');
  const outLibrary = results.filter(r => r.kind === 'out_of_library');
  const durations = results.map(r => r.seconds).sort((a, b) => a - b);
  const pct = (p: number) => durations[Math.min(durations.length - 1, Math.ceil(p * durations.length) - 1)];
  const summary = {
    inLibraryHitRate: `${inLibrary.filter(r => r.pass).length}/${inLibrary.length}`,
    outOfLibrary: `${outLibrary.filter(r => r.pass).length}/${outLibrary.length}`,
    p50Seconds: pct(0.5),
    p95Seconds: pct(0.95),
    databaseUnchanged: before.sessions === after.sessions && before.messages === after.messages,
    rowCounts: { before, after },
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'eval.json'), JSON.stringify({ ranAt: new Date().toISOString(), summary, results }, null, 1));
  console.log('\n' + JSON.stringify(summary, null, 1));
}

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: eval-retrieval.ts <out-dir>');
  process.exit(1);
}
main(outDir).catch(e => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
