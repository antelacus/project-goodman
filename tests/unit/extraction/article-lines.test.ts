import { articleStart, isHeadingLine } from '@/lib/extraction/article-lines';

// Sample lines as the library's PDFs print them (synthetic wording, real shapes).
describe('articleStart', () => {
  it('a spaced 第X条 starts an article whatever came before', () => {
    expect(articleStart('第一条 为了规范企业会计确认、计量和报告行为，制定本准则。', '')).toEqual({
      number: 1, articleNumber: '第一条', spaced: true, afterSentence: true, heading: true,
    });
    expect(articleStart('第一百零五条 企业应当按照规定处理。', '按照本准则')).toMatchObject({ number: 105, articleNumber: '第一百零五条', heading: true });
  });

  it('a bare 第X条 on its own line is spaced', () => {
    expect(articleStart('第二十条', '上一条结束。')).toMatchObject({ number: 20, spaced: true, heading: true });
  });

  it('an unspaced 第X条 after a finished sentence starts an article (the 2007 standards print no space)', () => {
    expect(articleStart('第二条本准则适用于所有企业。', '第一条 为了规范会计行为，制定本准则。')).toMatchObject({
      number: 2, spaced: false, afterSentence: true, heading: true,
    });
  });

  it('an unspaced 第X条 that continues a wrapped sentence is a reference, not a heading', () => {
    expect(articleStart('第二十五条的规定进行处理。', '企业应当按照本准则')).toMatchObject({
      number: 25, spaced: false, afterSentence: false, heading: false,
    });
  });

  it('an unspaced 第X条 that reads as a reference is not a heading even after a finished sentence', () => {
    for (const line of ['第五条规定的情形除外。', '第五条的规定同样适用。', '第五条第二款所称资产。', '第五条至第八条另有规定。']) {
      expect(articleStart(line, '上一句结束。')).toMatchObject({ heading: false });
    }
  });

  it('a chapter or section heading closes the sentence before an unspaced 第X条', () => {
    expect(articleStart('第三条企业应当设置会计账簿。', '第一章 总则')).toMatchObject({ afterSentence: true, heading: true });
  });

  it('is null for a line that does not begin with 第X条', () => {
    for (const line of ['按照本准则第二十五条的规定。', '第一章 总则', '（一）资产', '第1条 阿拉伯数字不算', '']) {
      expect(articleStart(line, '')).toBeNull();
    }
  });
});

describe('isHeadingLine', () => {
  it('matches 编、章、节 headings only', () => {
    expect(isHeadingLine('第一章 总则')).toBe(true);
    expect(isHeadingLine('第二节 确认')).toBe(true);
    expect(isHeadingLine('第三编')).toBe(true);
    expect(isHeadingLine('第一条 总则')).toBe(false);
    expect(isHeadingLine('第一章节奏')).toBe(false);
  });
});
