import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { rebuildFromOverlapping, firstDifference, chunksSha256, writeOnce, readVerified, nextStep } from '../../../scripts/rechunk-documents';

const SQL_TWO_CHUNKS = '0b4193662eaf7f5570e493d45d35831a82052e4fd738f18401fd94b984cc4cbf';
const SQL_NO_CHUNKS = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/** The admin route's old chunker, as it was. */
function oldChunks(text: string): string[] {
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += 800) chunks.push(text.slice(start, start + 1000));
  return chunks;
}

describe('rebuildFromOverlapping', () => {
  it('rebuilds the text the old chunker was given, whatever its length', () => {
    for (const n of [0, 5, 999, 1000, 1001, 1100, 1800, 1801, 5000]) {
      const text = Array.from({ length: n }, (_, i) => String.fromCharCode(0x4e00 + (i % 500))).join('');
      expect(rebuildFromOverlapping(oldChunks(text))).toEqual({ text });
    }
  });

  it('counts in code units, so characters outside the BMP rebuild too', () => {
    const text = '𠀀'.repeat(900) + '尾';
    expect(rebuildFromOverlapping(oldChunks(text))).toEqual({ text });
  });

  it('reports the first boundary that is not a 200-unit overlap', () => {
    const chunks = oldChunks('甲'.repeat(3000));
    chunks[2] = '乙' + chunks[2].slice(1);
    expect(rebuildFromOverlapping(chunks)).toEqual({ boundary: 2 });
  });
});

describe('firstDifference', () => {
  it('is the first differing index, or the shorter length', () => {
    expect(firstDifference('abc', 'abd')).toBe(2);
    expect(firstDifference('ab', 'abc')).toBe(2);
    expect(firstDifference('abc', 'abc')).toBe(3);
  });
});

describe('Codex pre-deploy review', () => {
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'rechunk-'));
  const entry = { id: 'd1', name: 'a.md', oldChunksSha256: chunksSha256(['旧一', '旧二']), newChunksSha256: chunksSha256(['新']) };
  const rows = [
    { id: 'c2', document_id: 'd1', chunk_index: 1, content: '旧二' },
    { id: 'c1', document_id: 'd1', chunk_index: 0, content: '旧一' },
  ];
  const writeCheck = (dir: string, backup: unknown[]) => {
    const backupJson = JSON.stringify(backup);
    const backupSha256 = crypto.createHash('sha256').update(backupJson).digest('hex');
    writeOnce(dir, { 'backup.json': backupJson, 'report.json': JSON.stringify({ checkedAt: '', backupSha256, documents: [entry] }) });
  };

  it('M1 check never overwrites an earlier backup', () => {
    const dir = tmp();
    writeCheck(dir, rows);
    expect(() => writeCheck(dir, [])).toThrow(/already holds/);
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'backup.json'), 'utf8'))).toHaveLength(2);
  });

  it('M1 apply verifies the backup against the report before anything else', () => {
    const good = tmp();
    writeCheck(good, rows);
    expect(readVerified(good).documents).toHaveLength(1);

    const edited = tmp();
    writeCheck(edited, rows);
    fs.writeFileSync(path.join(edited, 'backup.json'), JSON.stringify(rows.slice(1)));
    expect(() => readVerified(edited)).toThrow(/does not match/);

    const incomplete = tmp();
    writeCheck(incomplete, rows.slice(1));
    expect(() => readVerified(incomplete)).toThrow(/lacks the old chunks of a.md/);
  });

  it('S8 a re-run skips a document already re-chunked and stops on one changed since check', () => {
    expect(nextStep(entry, chunksSha256(['旧一', '旧二']))).toBe('replace');
    expect(nextStep(entry, chunksSha256(['新']))).toBe('done');
    expect(() => nextStep(entry, chunksSha256(['别人改过']))).toThrow(/changed since check/);
  });

  it('M2 the chunk hash is the formula replace_document_chunks computes in SQL', () => {
    // encode(sha256(convert_to(string_agg(encode(sha256(convert_to(c, 'UTF8')), 'hex'), ','), 'UTF8')), 'hex')
    // over ('甲', '乙😀'), and over no rows (coalesced to ''), run on Postgres 17:
    expect(chunksSha256(['甲', '乙😀'])).toBe(SQL_TWO_CHUNKS);
    expect(chunksSha256([])).toBe(SQL_NO_CHUNKS);
  });
});
