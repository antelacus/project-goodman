/**
 * Re-chunk every stored document with the non-overlapping chunker
 * (ai-provider REQ §5.7; public-readiness DESIGN §6, §9 step 1). One-off: deleted
 * before v4.8.0 closes.
 *
 *   npx tsx scripts/rechunk-documents.ts check <out-dir>
 *     Read-only. For each document, rebuilds its text two independent ways — from
 *     the old overlapping chunks, and by re-extracting the original file from
 *     Storage — and requires them to be identical. Writes <out-dir>/report.json
 *     (hashes, chunk counts, anomalies; no document text) and <out-dir>/backup.json
 *     (every current document_chunks row, the rollback copy).
 *
 *   npx tsx scripts/rechunk-documents.ts apply <out-dir>
 *     Replaces each clean document's chunks, one transaction per document
 *     (replace_document_chunks), then re-reads them and checks they join to the
 *     text. Refuses if a document or its chunks changed since `check`, or if any
 *     anomaly lacks a ruling in report.json. Re-runnable.
 *
 * Credentials come from .env.scripts (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY),
 * which Next.js does not load, so local dev never reaches production.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSectionAwareChunks } from '@/lib/documents/chunker';
import { extractTextFromFile } from '@/lib/documents/extract-text';

/** The admin upload route's old chunker: chunk i was text[800i, 800i + 1000). */
const OLD_SIZE = 1000;
const OLD_STEP = 800;

type Anomaly =
  | { kind: 'not_admin_upload'; ownerType: string }
  | { kind: 'overlap_mismatch'; boundary: number }
  | { kind: 'no_independent_source'; reason: string }
  | { kind: 'text_mismatch'; firstDifference: number; fromChunks: number; fromFile: number };

interface DocumentReport {
  id: string;
  name: string;
  fileSha256: string | null;
  oldChunksSha256: string;
  textSha256: string | null;
  oldChunks: number;
  newChunks: number;
  anomalies: Anomaly[];
  /** Filled in by Jason before apply: one ruling per anomaly, same order. */
  rulings?: string[];
}

/**
 * The text the old chunker was given, rebuilt from its chunks: each chunk after the
 * first starts OLD_STEP code units into the one before it, and only the last one may
 * be shorter than OLD_SIZE (a text of 801–1000 units still got a second, tail chunk).
 * Returns the first boundary that breaks this instead.
 */
export function rebuildFromOverlapping(chunks: string[]): { text: string } | { boundary: number } {
  let text = chunks[0] ?? '';
  for (let i = 1; i < chunks.length; i++) {
    const prev = chunks[i - 1];
    const repeated = prev.slice(OLD_STEP);
    const fullOrLast = prev.length === OLD_SIZE || i === chunks.length - 1;
    if (!fullOrLast || !repeated || !chunks[i].startsWith(repeated)) return { boundary: i };
    text += chunks[i].slice(repeated.length);
  }
  return { text };
}

export function firstDifference(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return n;
}

const sha256 = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex');

function connect(): SupabaseClient {
  dotenv.config({ path: '.env.scripts', quiet: true });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('.env.scripts must set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

interface Doc { id: string; name: string; file_url: string | null; owner_type: string | null }
interface ChunkRow { id: string; document_id: string; chunk_index: number; content: string; [column: string]: unknown }

async function documents(db: SupabaseClient): Promise<Doc[]> {
  const { data, error } = await db.from('documents').select('id, name, file_url, owner_type').order('name');
  if (error) throw new Error(`documents query failed: ${error.message}`);
  return data as Doc[];
}

async function chunksOf(db: SupabaseClient, documentId: string): Promise<ChunkRow[]> {
  const { data, error } = await db.from('document_chunks').select('*').eq('document_id', documentId).order('chunk_index');
  if (error) throw new Error(`chunks query failed: ${error.message}`);
  return data as ChunkRow[];
}

/** The original file's text by the upload route's own extraction; null when that would need the AI (a scan). */
async function textFromFile(db: SupabaseClient, doc: Doc): Promise<{ text: string; fileSha256: string } | { reason: string }> {
  if (!doc.file_url) return { reason: 'no original file in Storage' };
  const { data, error } = await db.storage.from('document-files').download(doc.file_url);
  if (error) return { reason: `download failed: ${error.message}` };
  const bytes = Buffer.from(await data.arrayBuffer());
  const ext = doc.name.toLowerCase().split('.').pop();
  if (!['pdf', 'xlsx', 'txt', 'md'].includes(ext ?? '')) return { reason: `.${ext} is read by the AI` };
  if (ext === 'pdf') {
    const { extractText } = await import('unpdf');
    const { text } = await extractText(new Uint8Array(bytes));
    if (text.join('\n\n').trim().length <= 100) return { reason: 'a scan, read by the AI' };
  }
  const { text } = await extractTextFromFile(bytes.toString('base64'), doc.name);
  return { text, fileSha256: sha256(bytes) };
}

async function check(outDir: string) {
  const db = connect();
  fs.mkdirSync(outDir, { recursive: true });
  const reports: DocumentReport[] = [];
  const backup: ChunkRow[] = [];

  for (const doc of await documents(db)) {
    const rows = await chunksOf(db, doc.id);
    backup.push(...rows);
    const old = rows.map(r => r.content);
    const anomalies: Anomaly[] = [];
    let text: string | null = null;
    let fileSha256: string | null = null;

    if (doc.owner_type !== 'system') anomalies.push({ kind: 'not_admin_upload', ownerType: String(doc.owner_type) });
    const rebuilt = rebuildFromOverlapping(old);
    if ('boundary' in rebuilt) anomalies.push({ kind: 'overlap_mismatch', boundary: rebuilt.boundary });
    const source = await textFromFile(db, doc);
    if ('reason' in source) anomalies.push({ kind: 'no_independent_source', reason: source.reason });
    if ('text' in rebuilt && 'text' in source) {
      fileSha256 = source.fileSha256;
      if (rebuilt.text === source.text) text = source.text;
      else anomalies.push({ kind: 'text_mismatch', firstDifference: firstDifference(rebuilt.text, source.text), fromChunks: rebuilt.text.length, fromFile: source.text.length });
    }

    reports.push({
      id: doc.id,
      name: doc.name,
      fileSha256,
      oldChunksSha256: sha256(JSON.stringify(old)),
      textSha256: text === null ? null : sha256(text),
      oldChunks: old.length,
      newChunks: text === null ? 0 : createSectionAwareChunks(text, []).length,
      anomalies,
    });
    console.log(`${anomalies.length ? '✗' : '✓'} ${doc.name}: ${old.length} → ${text === null ? '-' : reports[reports.length - 1].newChunks}${anomalies.map(a => ` [${a.kind}]`).join('')}`);
  }

  fs.writeFileSync(path.join(outDir, 'backup.json'), JSON.stringify(backup));
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ checkedAt: new Date().toISOString(), documents: reports }, null, 2));
  const flagged = reports.filter(r => r.anomalies.length);
  console.log(`\n${reports.length} documents, ${flagged.length} with anomalies; backup of ${backup.length} chunks written.`);
}

async function apply(outDir: string) {
  const db = connect();
  const report = JSON.parse(fs.readFileSync(path.join(outDir, 'report.json'), 'utf8')) as { documents: DocumentReport[] };
  const unruled = report.documents.filter(d => d.anomalies.length && (d.rulings?.length ?? 0) !== d.anomalies.length);
  if (unruled.length) throw new Error(`anomalies without a ruling: ${unruled.map(d => d.name).join(', ')}`);

  for (const entry of report.documents) {
    if (entry.textSha256 === null) {
      console.log(`- ${entry.name}: left as is (${entry.rulings?.join('; ')})`);
      continue;
    }
    const doc = (await documents(db)).find(d => d.id === entry.id);
    if (!doc) throw new Error(`${entry.name} no longer exists`);
    const old = (await chunksOf(db, doc.id)).map(r => r.content);
    if (sha256(JSON.stringify(old)) !== entry.oldChunksSha256) throw new Error(`${entry.name}: chunks changed since check`);
    const source = await textFromFile(db, doc);
    if (!('text' in source) || sha256(source.text) !== entry.textSha256 || source.fileSha256 !== entry.fileSha256) {
      throw new Error(`${entry.name}: original file changed since check`);
    }

    const chunks = createSectionAwareChunks(source.text, []).map(c => ({ content: c.content }));
    const { error } = await db.rpc('replace_document_chunks', { p_document_id: doc.id, p_chunks: chunks });
    if (error) throw new Error(`${entry.name}: replace failed: ${error.message}`);
    const stored = (await chunksOf(db, doc.id)).map(r => r.content);
    if (stored.join('') !== source.text) throw new Error(`${entry.name}: stored chunks do not join to the text`);
    console.log(`✓ ${entry.name}: ${old.length} → ${stored.length}`);
  }
}

if (process.argv[1]?.endsWith('rechunk-documents.ts')) {
  const [mode, outDir] = process.argv.slice(2);
  if (!outDir || (mode !== 'check' && mode !== 'apply')) {
    console.error('usage: npx tsx scripts/rechunk-documents.ts check|apply <out-dir>');
    process.exit(2);
  }
  (mode === 'check' ? check(outDir) : apply(outDir)).catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
