import { splitRegulation, chineseToNumber, normalizeIdeographs } from '@/lib/extraction/regulation-splitter';

const numbers = (pages: string[]) => splitRegulation(pages, pages.length).articles.map(a => a.number);

describe('regulation splitter', () => {
  it('parses Chinese article numbers', () => {
    expect([chineseToNumber('一'), chineseToNumber('十'), chineseToNumber('十二'), chineseToNumber('一百零五'), chineseToNumber('一百二十一')])
      .toEqual([1, 10, 12, 105, 121]);
    expect(chineseToNumber('甲')).toBeNaN();
  });

  it('reads Kangxi radicals as the ideographs they render as', () => {
    expect(normalizeIdeographs('第⼀条 纳税⼈')).toBe('第一条 纳税人');
    expect(normalizeIdeographs('进出⼜货物')).toBe('进出口货物');
    expect(numbers(['第⼀条 甲。\n第⼆条 乙。'])).toEqual([1, 2]);
  });

  it('accepts a heading printed without a space unless it reads as a reference', () => {
    const { articles, anomalies } = splitRegulation(['第一条为了规范存货。\n第二条存货，是指……按照\n第三条的规定处理。\n第三条存货应当计量。'], 1);
    expect(articles.map(a => a.number)).toEqual([1, 2, 3]);
    expect(articles[1].content).toContain('第三条的规定处理。');
    expect(anomalies).toEqual([{ kind: 'next_number_as_reference', page: 1, line: '第三条的规定处理。' }]);
  });

  it('starts an article at a skip after a finished sentence and reports it', () => {
    for (const text of ['第一条 甲。\n第三条 丙。', '第一条甲。\n第三条丙。']) {
      const { articles, anomalies } = splitRegulation([text], 1);
      expect(articles.map(a => a.number)).toEqual([1, 3]);
      expect(anomalies).toEqual([{ kind: 'skipped_number', page: 1, line: text.split('\n')[1], expected: 2, found: 3 }]);
    }
  });

  it('keeps an unspaced line-start number inside the sentence it wraps from', () => {
    const { articles, anomalies } = splitRegulation(['第一条甲应当按照\n第二条与第三条处理。\n第二条乙。'], 1);
    expect(articles.map(a => a.number)).toEqual([1, 2]);
    expect(articles[0].content).toBe('第一条甲应当按照\n第二条与第三条处理。');
    expect(anomalies).toEqual([{ kind: 'next_number_as_reference', page: 1, line: '第二条与第三条处理。' }]);
  });

  it('closes up a letter-spaced justified line before reading it', () => {
    const { articles, anomalies } = splitRegulation(['第九条 甲。\n第 十 条 职 工 只 有 在 企 业 工作\n满一年。'.replace('第九条', '第一条')], 1);
    expect(anomalies).toEqual([{ kind: 'skipped_number', page: 1, line: '第十条职工只有在企业工作', expected: 2, found: 10 }]);
    expect(articles[1].content).toBe('第十条职工只有在企业工作\n满一年。');
  });

  it('does not split at a repeated number', () => {
    const { articles, anomalies } = splitRegulation(['第一条 甲。\n第二条 乙。\n第二条 乙又一次。'], 1);
    expect(articles.map(a => a.number)).toEqual([1, 2]);
    expect(anomalies).toEqual([{ kind: 'repeated_number', page: 1, line: '第二条 乙又一次。', articleNumber: '第二条' }]);
  });

  it('drops running headers, page numbers and headings, and stops at an appendix', () => {
    const pages = [
      '示例准则\n1\n第一章 总则\n第一条 甲。',
      '示例准则\n2\n第二条 乙，\n续写。',
      '示例准则\n- 3 -\n第二节 计量\n第三条 丙。\n附录：格式\n表一',
    ];
    const { articles, anomalies } = splitRegulation(pages, 3);
    expect(articles.map(a => a.content)).toEqual(['第一条 甲。', '第二条 乙，\n续写。', '第三条 丙。']);
    expect(articles[2].hierarchy).toEqual(['第一章 总则', '第二节 计量']);
    expect(anomalies).toEqual([{ kind: 'appendix_after_articles', page: 3, line: '附录：格式' }]);
  });
});
