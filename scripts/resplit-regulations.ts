/**
 * Re-split the structured regulations from their original files (REQ §5.6).
 *
 *   npx tsx scripts/resplit-regulations.ts check <out-dir>
 *     Read-only. Downloads every regulation's original file from Storage, splits
 *     it page by page, and writes <out-dir>/report.json (per-document articles,
 *     anomalies and the file's sha256) and <out-dir>/anomalies.md for Jason.
 *
 *   npx tsx scripts/resplit-regulations.ts apply <out-dir>
 *     Replaces each document's articles with the checked split, one transaction
 *     per document (replace_regulation_articles), then re-reads the table and
 *     verifies it. Refuses to run if the document set or any file changed since
 *     `check`, or if any anomaly in report.json lacks a ruling. Re-runnable.
 *
 * Credentials come from .env.scripts (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY),
 * which Next.js does not load, so local dev never reaches production.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { splitRegulation, type SplitAnomaly, type SplitArticle } from '@/lib/extraction/regulation-splitter';
import { REGULATION_TYPES } from '@/lib/documents/constants';

interface DocumentReport {
  id: string;
  name: string;
  fileUrl: string;
  sha256: string;
  pageCount: number;
  articles: SplitArticle[];
  anomalies: SplitAnomaly[];
  /** Filled in by Jason before apply: one ruling per anomaly, same order. */
  rulings?: string[];
}

interface Report {
  checkedAt: string;
  documents: DocumentReport[];
}

function connect(): SupabaseClient {
  dotenv.config({ path: '.env.scripts', quiet: true });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('.env.scripts must set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function regulationDocuments(db: SupabaseClient) {
  const { data, error } = await db
    .from('documents')
    .select('id, name, file_url')
    .in('doc_type', REGULATION_TYPES)
    .order('name');
  if (error) throw new Error(`documents query failed: ${error.message}`);
  return data as Array<{ id: string; name: string; file_url: string | null }>;
}

async function download(db: SupabaseClient, fileUrl: string): Promise<Buffer> {
  const { data, error } = await db.storage.from('document-files').download(fileUrl);
  if (error) throw new Error(`download ${fileUrl} failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

const sha256 = (bytes: Buffer) => crypto.createHash('sha256').update(bytes).digest('hex');

async function check(outDir: string) {
  const db = connect();
  const documents: DocumentReport[] = [];

  for (const doc of await regulationDocuments(db)) {
    if (!doc.file_url) throw new Error(`${doc.name} has no original file in Storage`);
    const bytes = await download(db, doc.file_url);
    const { extractText } = await import('unpdf');
    const { totalPages, text } = await extractText(new Uint8Array(bytes));
    const { articles, anomalies } = splitRegulation(text, totalPages);
    documents.push({ id: doc.id, name: doc.name, fileUrl: doc.file_url, sha256: sha256(bytes), pageCount: totalPages, articles, anomalies });
    console.log(`${doc.name}: ${articles.length} articles, ${anomalies.length} anomalies`);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const report: Report = { checkedAt: new Date().toISOString(), documents };
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
  fs.writeFileSync(path.join(outDir, 'anomalies.md'), anomalyList(documents));
  const total = documents.reduce((n, d) => n + d.anomalies.length, 0);
  console.log(`\n${documents.length} documents, ${documents.reduce((n, d) => n + d.articles.length, 0)} articles, ${total} anomalies → ${outDir}`);
}

function anomalyList(documents: DocumentReport[]): string {
  const lines = ['# 条款拆分异常清单', ''];
  for (const doc of documents.filter(d => d.anomalies.length > 0)) {
    lines.push(`## ${doc.name}（${doc.articles.length} 条，${doc.pageCount} 页）`, '');
    doc.anomalies.forEach((a, i) => lines.push(`${i + 1}. ${describe(a)}`));
    lines.push('');
  }
  return lines.join('\n');
}

function describe(a: SplitAnomaly): string {
  switch (a.kind) {
    case 'page_count_mismatch': return `页数不符：PDF ${a.expected} 页，抽取 ${a.extracted} 页`;
    case 'empty_page': return `第 ${a.page} 页没有文字`;
    case 'no_articles': return '没有拆出任何条款';
    case 'skipped_number': return `第 ${a.page} 页跳号：应为第 ${a.expected} 条，出现第 ${a.found} 条 —— 「${a.line}」`;
    case 'repeated_number': return `第 ${a.page} 页重复或倒退的条款号 ${a.articleNumber}，未切分 —— 「${a.line}」`;
    case 'next_number_as_reference': return `第 ${a.page} 页行首是下一条的号码，但读作引用，按正文处理 —— 「${a.line}」`;
    case 'unspaced_skip': return `第 ${a.page} 页行首「第X条」无空格且跳号（应为第 ${a.expected} 条，出现第 ${a.found} 条），按正文处理 —— 「${a.line}」`;
    case 'appendix_after_articles': return `第 ${a.page} 页起为附录，不归入任何条款 —— 「${a.line}」`;
  }
}

async function apply(outDir: string) {
  const db = connect();
  const report: Report = JSON.parse(fs.readFileSync(path.join(outDir, 'report.json'), 'utf8'));

  // A blank ruling is no ruling.
  const unruled = report.documents.filter(
    d => d.anomalies.length > 0 && (d.rulings ?? []).filter(r => r.trim()).length !== d.anomalies.length
  );
  if (unruled.length > 0) {
    throw new Error(`anomalies without a ruling: ${unruled.map(d => d.name).join('、')}`);
  }

  // The checked split is only valid for the documents and files it was made from.
  const current = await regulationDocuments(db);
  const checkedIds = report.documents.map(d => d.id).sort().join();
  if (current.map(d => d.id).sort().join() !== checkedIds) {
    throw new Error('the set of regulation documents changed since check; run check again');
  }
  for (const doc of report.documents) {
    if (sha256(await download(db, doc.fileUrl)) !== doc.sha256) {
      throw new Error(`${doc.name}: the original file changed since check; run check again`);
    }
  }

  for (const doc of report.documents.filter(d => d.articles.length > 0)) {
    const payload = doc.articles.map(a => ({
      regulation_name: doc.name.replace(/\.(pdf|txt|md)$/i, ''),
      article_number: a.articleNumber,
      content: a.content,
      hierarchy: a.hierarchy,
      metadata: { firstPage: a.firstPage, lastPage: a.lastPage },
    }));
    const { data, error } = await db.rpc('replace_regulation_articles', { p_document_id: doc.id, p_articles: payload });
    if (error) throw new Error(`${doc.name}: replace failed: ${error.message}`);
    console.log(`${doc.name}: ${data} articles written`);
  }

  await verify(db, report);
}

/** Re-reads the table: each document holds exactly the checked articles, in order. */
async function verify(db: SupabaseClient, report: Report) {
  const problems: string[] = [];
  const checked = report.documents.filter(d => d.articles.length > 0);
  for (const doc of checked) {
    const { data, error } = await db
      .from('structured_regulations')
      .select('article_number, content')
      .eq('document_id', doc.id);
    if (error) throw new Error(`verify ${doc.name}: ${error.message}`);
    const stored = new Map((data ?? []).map(r => [r.article_number as string, r.content as string]));
    if (stored.size !== (data ?? []).length) problems.push(`${doc.name}: repeated article numbers`);
    if (stored.size !== doc.articles.length) problems.push(`${doc.name}: ${stored.size} stored, ${doc.articles.length} expected`);
    for (const a of doc.articles) {
      if (stored.get(a.articleNumber) !== a.content) problems.push(`${doc.name}: ${a.articleNumber} differs`);
    }
  }
  if (problems.length > 0) throw new Error(`verification failed:\n${problems.join('\n')}`);
  const skipped = report.documents.filter(d => d.articles.length === 0);
  console.log(`verified ${checked.length} documents` + (skipped.length ? `; ${skipped.length} without articles, not replaced: ${skipped.map(d => d.name).join('、')}` : ''));
}

const [mode, outDir] = process.argv.slice(2);
const run = mode === 'check' ? check : mode === 'apply' ? apply : null;
if (!run || !outDir) {
  console.error('usage: resplit-regulations.ts check|apply <out-dir>');
  process.exit(1);
}
run(outDir).catch(e => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
