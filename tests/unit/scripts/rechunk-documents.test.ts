import { rebuildFromOverlapping, firstDifference } from '../../../scripts/rechunk-documents';

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
