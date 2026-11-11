// Regressions for the Codex pre-deploy review of src/lib/citations (public-readiness
// TRACK 三). Each case is a way the shown answer could carry an article number the
// evidence does not hold, or lose text it should keep.

import { finalizeAnswer, OUT_OF_LIBRARY_LABEL, REMOVED_MARKER as M, type Evidence } from '@/lib/citations';

const EVIDENCE: Evidence[] = [
  { id: 'R1', kind: 'regulation', name: '企业会计准则第99号-示例业务-2026', articleNumber: '第一条', documentId: 'doc-1', fileUrl: null },
  { id: 'R2', kind: 'regulation', name: '中华人民共和国示例法-2024', articleNumber: '第十二条', documentId: 'doc-2', fileUrl: null },
];
const R1 = '《企业会计准则第99号——示例业务》第一条';
const R2 = '《中华人民共和国示例法》第十二条';
const ctx = { evidence: EVIDENCE, regulationSearched: true, allRegulationSearchesFailed: false };
const run = (answer: string) => finalizeAnswer(answer, ctx);

describe('citations: Codex pre-deploy review', () => {
  it('M1 a character reference outside the BMP does not shift the replacement off the flagged number', () => {
    // The reference stays as written; the page shows it as 😀.
    expect(run('😀&#x1F600;第99条可以免税。依据[R1]。')).toEqual({ text: `😀&#x1F600;${M}可以免税。依据${R1}。`, cited: [EVIDENCE[0]], removed: 1 });
  });

  it('M2 named references and full-width digits that only appear after decoding are caught', () => {
    for (const written of ['第&nbsp;99条', '第&#xff19;&#xff19;条', '第&#65305;&#65305;条']) {
      expect(run(`依据${written}可以免税。依据[R1]。`), written).toMatchObject({ text: `依据${M}可以免税。依据${R1}。`, removed: 1 });
    }
  });

  it('M3 links with a title are links; a code span shows its content as written', () => {
    expect(run('依据[第99条](https://example.invalid "标题")可以免税。依据[R1]。')).toMatchObject({ text: `依据${M}可以免税。依据${R1}。`, removed: 1 });
    // A span that is nothing but the flagged id goes whole; inside a longer span only the id is replaced.
    expect(run('依据`[R99]`可以免税。依据[R1]。')).toMatchObject({ text: `依据${M}可以免税。依据${R1}。`, removed: 1 });
    expect(run('依据`见[R99]`可以免税。依据[R1]。')).toMatchObject({ text: `依据\`见${M}\`可以免税。依据${R1}。`, removed: 1 });
    expect(run('写作`[R1](x)`即可。依据[R2]。')).toMatchObject({ text: `写作\`${R1}(x)\`即可。依据${R2}。`, removed: 0 });
  });

  it('M4 whitespace inside the numeral does not hide an article number', () => {
    for (const written of ['第十\n九条', '第十 九条', '第1 9条']) {
      expect(run(`依据${written}可以免税。依据[R1]。`), JSON.stringify(written)).toMatchObject({ removed: 1 });
      expect(run(`依据${written}可以免税。依据[R1]。`).text, JSON.stringify(written)).not.toMatch(/九条|9条/);
    }
  });

  it('M5 every addition after a valid id goes, however many, parenthesised or not', () => {
    for (const tail of ['第二款第三项', '之十二', '（第二款）', '第二款之三', '第二款（第三项）']) {
      expect(run(`依据[R1]${tail}，应当复核。依据[R2]。`), tail).toEqual({ text: `依据${R1}${M}，应当复核。依据${R2}。`, cited: EVIDENCE, removed: 1 });
    }
    // "[R1](第二款)" is link syntax: the page shows a link reading "R1", not a citation.
    expect(run('依据[R1](第二款)，应当复核。依据[R2]。')).toEqual({ text: `依据${M}，应当复核。依据${R2}。`, cited: [EVIDENCE[1]], removed: 1 });
  });

  it('M6 an id that only appears in a reference definition, which the page does not show, is not a citation', () => {
    const { text, cited } = run('企业可以免税。\n\n[R1]: https://example.invalid');
    expect(cited).toEqual([]);
    expect(text.startsWith(OUT_OF_LIBRARY_LABEL)).toBe(true);
  });

  it('M7 flagged numbers in separate list items stay separate places', () => {
    const { text, removed } = run('依据[R1]：\n- 第九条\n- 第十条');
    expect(removed).toBe(2);
    expect(text).toBe(`依据${R1}：\n- ${M}\n- ${M}`);
  });

  it('M8 a label the model wrote inside a link is not added a second time', () => {
    const { text } = finalizeAnswer(`[${OUT_OF_LIBRARY_LABEL}](https://example.invalid)：企业可以免税。`, ctx);
    expect(text).toBe(`${OUT_OF_LIBRARY_LABEL}\n\n企业可以免税。`);
  });

  it('S9 a replacement over part of a strong or link leaves no unpaired Markdown', () => {
    expect(run('依据**第九**条可以免税。依据[R1]。').text).toBe(`依据${M}可以免税。依据${R1}。`);
    expect(run('依据第[九](x)条可以免税。依据[R1]。').text).toBe(`依据${M}可以免税。依据${R1}。`);
  });

  it('S10 an invalid character reference does not throw', () => {
    expect(() => run('依据&#x110000;第9条。依据[R1]。')).not.toThrow();
    expect(run('依据&#x110000;第9条。依据[R1]。').removed).toBe(1);
  });
});

describe('citations: GFM and CJK emphasis (the page renders both)', () => {
  it('a table cell is its own place: numbers in two cells are two removals, the table stays a table', () => {
    const { text, removed } = run('依据[R1]：\n\n| 事项 | 依据 |\n|---|---|\n| 甲 | 第九条 |\n| 乙 | 第十条 |');
    expect(removed).toBe(2);
    expect(text).toBe(`依据${R1}：\n\n| 事项 | 依据 |\n|---|---|\n| 甲 | ${M} |\n| 乙 | ${M} |`);
  });

  it('a valid id inside a table cell is cited', () => {
    expect(run('| 事项 | 依据 |\n|---|---|\n| 收入 | [R1] |')).toMatchObject({ text: `| 事项 | 依据 |\n|---|---|\n| 收入 | ${R1} |`, removed: 0 });
  });

  it('strikethrough still shows its text', () => {
    expect(run('依据~~第九条~~可以免税。依据[R1]。')).toMatchObject({ text: `依据${M}可以免税。依据${R1}。`, removed: 1 });
  });

  it('a footnote reference renders as a number, so 第[^1]条 is an article number; a footnote\'s text is shown', () => {
    expect(run('依据第[^1]条可以免税。依据[R1]。\n\n[^1]: 注').removed).toBe(1);
    expect(run('依据[R1]。[^1]\n\n[^1]: 另见第五条').removed).toBe(1);
  });

  it('CJK emphasis closes after Chinese punctuation, and a number inside it is still caught whole', () => {
    expect(run('**依据第九条。**企业可以免税。依据[R1]。').text).toBe(`**依据${M}。**企业可以免税。依据${R1}。`);
  });
});

describe('citations: /code-review on PR #13', () => {
  it('2 lists and ranges of article numbers are article numbers', () => {
    for (const written of ['第十一、十二条', '第五至七条', '第5-7条', '第五条至第七条']) {
      expect(run(`依据${written}的规定。依据[R1]。`), written).toMatchObject({ text: `依据${M}的规定。依据${R1}。`, removed: 1 });
    }
  });

  it('3 a code block\'s info string is not shown; the number in its body is what gets replaced', () => {
    const { text, removed } = run('```第九条\n第九条\n```\n\n依据[R1]。');
    expect(removed).toBe(1);
    expect(text.split('\n').slice(1).join('\n')).not.toContain('第九条');
  });

  it('4 invisible format characters inside a number do not hide it', () => {
    for (const written of ['第五​条', '第⁠五条', '第五­条', '第五&#8203;条']) {
      expect(run(`依据${written}可以免税。依据[R1]。`), JSON.stringify(written)).toMatchObject({ removed: 1 });
    }
  });

  it('5 alt text (shown when an image fails) and link titles (shown on hover) are checked', () => {
    expect(run('![第九条](http://x/none.png)依据[R1]。')).toMatchObject({ removed: 1 });
    expect(run('[见此](http://x "依据第九条")依据[R1]。')).toMatchObject({ removed: 1 });
    expect(run('![第九条](http://x/none.png)依据[R1]。').text).not.toContain('第九条');
  });

  it('6 a bare D with digits is an id only when this question has D evidence; R&D years and cells stay', () => {
    expect(run('请看单元格 D12 的数值。依据[R1]。')).toMatchObject({ text: `请看单元格 D12 的数值。依据${R1}。`, removed: 0 });
    expect(run('R&D 2024年投入增加。依据[R1]。')).toMatchObject({ text: `R&D 2024年投入增加。依据${R1}。`, removed: 0 });
    const withD = { ...ctx, evidence: [...EVIDENCE, { id: 'D1', kind: 'user_document' as const, name: '合同.md', articleNumber: '第一条', documentId: 'u', fileUrl: null }] };
    expect(finalizeAnswer('依据D3可以免税。依据[R1]。', withD)).toMatchObject({ removed: 1 });
  });

  it('7 a valid citation swallowed by a removal is not counted as cited', () => {
    const { text, cited } = run('第*五条[R1]*');
    expect(cited).toEqual([]);
    expect(text.startsWith(OUT_OF_LIBRARY_LABEL)).toBe(true);
  });
});
