// Property: whatever Markdown the model writes, the page never shows an article number or
// an id that did not come from the evidence. Answers are random strings of fragments that
// exercised the Codex pre-deploy findings; "shown" is read with the page's parser.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { ANSWER_SYNTAX } from '@/lib/markdown/answer-syntax';
import { finalizeAnswer, type Evidence } from '@/lib/citations';

const EVIDENCE: Evidence[] = [
  { id: 'R1', kind: 'regulation', name: '企业会计准则第99号-示例业务-2026', articleNumber: '第一条', documentId: 'd', fileUrl: null },
  { id: 'D1', kind: 'user_document', name: '合同.md', articleNumber: '第三条', documentId: 'u', fileUrl: null },
];
const PIECES = ['依据', '[R1]', '[D1]', '[R9]', '第', '九', '十', '\n', ' ', '条', '款', '之', '二', '**', '*', '`', '[', ']', '(x)', '(x "t")', '&#57;', '&nbsp;', '&#xff19;', '１', '- ', '> ', '\n\n', 'R', '2', '、', '（', '）', '$', '\\', '[R1]: http://x\n', '<b>', '</b>', '~~', '😀', '&#x1F600;', '| ', ' |', '\n|---|---|\n', '~~', '[^1]', '\n\n[^1]: ', 'www.x.io/', '。**'];
const parser = unified().use(remarkParse).use(ANSWER_SYNTAX);
function shownText(md: string): string {
  const out: string[] = [];
  // REASON: a minimal walk over mdast nodes of every type; only value, type and children are read.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (n: any) => {
    if (['definition', 'image', 'imageReference'].includes(n.type)) return;
    if ('value' in n) out.push(n.value);
    if (n.type === 'break') out.push('\n');
    if (n.type === 'footnoteReference') out.push('1');
    n.children?.forEach(walk);
    if (['paragraph', 'heading', 'listItem', 'code', 'math', 'html', 'blockquote', 'tableCell', 'footnoteDefinition'].includes(n.type)) out.push('\u0000');
  };
  walk(parser.runSync(parser.parse(md)));
  return out.join('').replace(/[０-９ＲＤ［］]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}
const NUMERAL = '[零〇一二三四五六七八九十百千两壹贰叁肆伍陆柒捌玖拾佰仟\\d]';
const BAD = new RegExp(`第\\s*(?:${NUMERAL}\\s*)*${NUMERAL}\\s*条|(?<![A-Za-z0-9])[RD]\\s*\\d+`);
let seed = 7;
const rand = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed % n);

it('never shows an article number or id that is not from the evidence', () => {
  const failures: string[] = [];
  for (let t = 0; t < 3000 && failures.length < 8; t++) {
    const answer = Array.from({ length: 4 + rand(14) }, () => PIECES[rand(PIECES.length)]).join('');
    let text: string;
    try { text = finalizeAnswer(answer, { evidence: EVIDENCE, regulationSearched: true, allRegulationSearchesFailed: false }).text; }
    catch (e) { failures.push(`THROW ${JSON.stringify(answer)} ${e}`); continue; }
    const shown = shownText(text).split('《企业会计准则第99号——示例业务》第一条').join('§').split('《合同》（您上传的文档）第三条').join('§');
    if (BAD.test(shown)) failures.push(`${JSON.stringify(answer)} -> ${JSON.stringify(text)}`);
  }
  expect(failures).toEqual([]);
});
