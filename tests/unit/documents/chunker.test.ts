import { createSectionAwareChunks } from '@/lib/documents/chunker';
import type { Section } from '@/lib/documents/parser';

const join = (text: string, sections: Section[] = [], size?: number) =>
  createSectionAwareChunks(text, sections, size).map(c => c.content).join('');

const paragraphs = (n: number, len = 120) =>
  Array.from({ length: n }, (_, i) => `第${i}段` + '甲'.repeat(len) + '。\n').join('');

describe('createSectionAwareChunks', () => {
  it('chunks concatenate to the text, with no overlap', () => {
    for (const text of [
      paragraphs(30),
      paragraphs(30).replace(/\n/g, '\r\n'),
      paragraphs(30).trimEnd(),
      '短文本',
    ]) {
      const chunks = createSectionAwareChunks(text, []);
      expect(chunks.map(c => c.content).join('')).toBe(text);
      expect(chunks.reduce((n, c) => n + c.content.length, 0)).toBe(text.length);
    }
  });

  it('returns nothing for an empty text', () => {
    expect(createSectionAwareChunks('', [])).toEqual([]);
  });

  it('cuts only at line ends and keeps each chunk within the size', () => {
    const chunks = createSectionAwareChunks(paragraphs(30), [], 1000);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.content.length).toBeLessThanOrEqual(1000);
      expect(c.content.endsWith('\n')).toBe(true);
    }
  });

  it('numbers chunks in order', () => {
    const chunks = createSectionAwareChunks(paragraphs(30), []);
    expect(chunks.map(c => c.chunkIndex)).toEqual(chunks.map((_, i) => i));
  });

  it('splits a line longer than the size at sentence ends, still concatenating to the text', () => {
    const line = Array.from({ length: 40 }, (_, i) => `句子${i}` + '乙'.repeat(60) + '。').join('');
    const chunks = createSectionAwareChunks(line, [], 1000);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map(c => c.content).join('')).toBe(line);
    for (const c of chunks) {
      expect(c.content.length).toBeLessThanOrEqual(1000);
      expect(c.content.endsWith('。')).toBe(true);
    }
  });

  it('hard-cuts a line longer than the size that has no sentence end', () => {
    const line = '丙'.repeat(2500);
    const chunks = createSectionAwareChunks(line, [], 1000);
    expect(chunks.map(c => c.content.length)).toEqual([1000, 1000, 500]);
  });

  describe('tables', () => {
    const table = (rows: number, outer = true) => {
      const wrap = (cells: string[]) => (outer ? `| ${cells.join(' | ')} |` : cells.join(' | '));
      return [
        wrap(['客户', '账期']),
        wrap(['---', '---']),
        ...Array.from({ length: rows }, (_, i) => wrap([`客户${i}`, `${30 + i}天`])),
      ].join('\n') + '\n';
    };

    for (const outer of [true, false]) {
      it(`keeps a table whole when it straddles the size (outer pipes: ${outer})`, () => {
        const t = table(20, outer);
        const text = paragraphs(6) + t + paragraphs(3);
        const chunks = createSectionAwareChunks(text, [], 1000);
        expect(chunks.map(c => c.content).join('')).toBe(text);
        expect(chunks.filter(c => c.content.includes(t))).toHaveLength(1);
      });
    }

    it('keeps a table longer than the size whole in one chunk', () => {
      const t = table(80);
      expect(t.length).toBeGreaterThan(1000);
      const text = paragraphs(2) + t + paragraphs(2);
      const chunks = createSectionAwareChunks(text, [], 1000);
      expect(chunks.map(c => c.content).join('')).toBe(text);
      expect(chunks.some(c => c.content.includes(t))).toBe(true);
    });

    it('does not treat lines with a pipe but no delimiter row as a table', () => {
      const lines = Array.from({ length: 40 }, (_, i) => `选项 ${i} | 说明` + '丁'.repeat(40) + '\n').join('');
      const chunks = createSectionAwareChunks(lines, [], 1000);
      expect(chunks.length).toBeGreaterThan(1);
      for (const c of chunks) expect(c.content.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('sections', () => {
    const preamble = '短序言\n';
    const body1 = '# 第一节\n' + paragraphs(10);
    const body2 = '# 第二节\n' + paragraphs(10);
    const text = preamble + body1 + body2;
    const sections: Section[] = [
      { title: '第一节', level: 1, startIndex: preamble.length },
      { title: '第二节', level: 1, startIndex: preamble.length + body1.length },
    ];

    it('keeps a short preamble and concatenates to the text', () => {
      expect(join(text, sections)).toBe(text);
    });

    it('never lets a chunk cross a section boundary, and tags each chunk with its section', () => {
      const chunks = createSectionAwareChunks(text, sections, 1000);
      let offset = 0;
      for (const c of chunks) {
        const start = offset;
        offset += c.content.length;
        const inside = sections.filter(s => s.startIndex > start && s.startIndex < offset);
        expect(inside).toEqual([]);
        const owner = [...sections].reverse().find(s => s.startIndex <= start);
        expect(c.sectionTitle).toBe(owner?.title);
      }
    });
  });

  describe('Codex pre-deploy review', () => {
    const table = '| 项目 | 金额 |\n| --- | --- |\n' + Array.from({ length: 30 }, (_, i) => `| 第${i}条 | ${i}00 |\n`).join('');

    it('M3 a section start inside a table does not split the table; the section starts after it', () => {
      const text = '前文\n' + table + '后文\n';
      const inside = text.indexOf('| 第5条');
      const chunks = createSectionAwareChunks(text, [{ title: '第5条', level: 1, startIndex: inside }], 100);
      expect(chunks.map(c => c.content).join('')).toBe(text);
      expect(chunks.some(c => c.content.includes(table))).toBe(true);
      expect(chunks.find(c => c.content.includes('后文'))?.sectionTitle).toBe('第5条');
    });

    it('M4 a lone \\r ends a line', () => {
      const text = Array.from({ length: 20 }, (_, i) => `第${i}行` + '甲'.repeat(40) + '\r').join('');
      const chunks = createSectionAwareChunks(text, [], 100);
      expect(chunks.map(c => c.content).join('')).toBe(text);
      for (const c of chunks) expect(c.content.endsWith('\r')).toBe(true);
    });

    it('M5 rejects a chunk size that is not a positive integer', () => {
      for (const size of [0, -1, 1.5, NaN]) expect(() => createSectionAwareChunks('文本', [], size)).toThrow(RangeError);
    });

    it('M6 cuts an over-long English line at full stops, not inside a sentence', () => {
      const line = Array.from({ length: 20 }, (_, i) => `Sentence ${i} has some words in it.`).join(' ') + '\n';
      const chunks = createSectionAwareChunks(line, [], 100);
      expect(chunks.map(c => c.content).join('')).toBe(line);
      for (const c of chunks.slice(0, -1)) expect(c.content.trimEnd().endsWith('.')).toBe(true);
    });

    it('M7 a "table" inside a code fence is not kept whole as a table', () => {
      const text = '```\n' + table + '```\n';
      const chunks = createSectionAwareChunks(text, [], 100);
      expect(chunks.map(c => c.content).join('')).toBe(text);
      for (const c of chunks) expect(c.content.length).toBeLessThanOrEqual(100);
    });

    it('S9 a hard cut never splits a surrogate pair', () => {
      const text = '😀'.repeat(150);
      const chunks = createSectionAwareChunks(text, [], 101);
      expect(chunks.map(c => c.content).join('')).toBe(text);
      for (const c of chunks) expect(c.content.isWellFormed()).toBe(true);
    });

    it('S10 builds the section path from unsorted sections', () => {
      const text = '# 第一章\n' + paragraphs(2) + '## 第一节\n' + paragraphs(2);
      const sections: Section[] = [
        { title: '第一节', level: 2, startIndex: text.indexOf('## 第一节'), parent: '第一章' },
        { title: '第一章', level: 1, startIndex: 0 },
      ];
      const chunks = createSectionAwareChunks(text, sections);
      expect(chunks.at(-1)?.sectionPath).toEqual(['第一章', '第一节']);
    });
  });
});

