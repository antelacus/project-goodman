/**
 * Where article numbers in an answer come from (ai-provider REQ §5.4, §5.5).
 *
 * The model cites only by evidence id: [Rn] for a regulation search result, [Dn]
 * for an article of a document the user selected. This module turns valid ids
 * into 《名》第X条, so an article number shown to the user is always one the
 * evidence holds. Anything else that shows as an article number or an id — one
 * the model wrote itself, an unknown id, a paragraph tacked onto a valid id — is
 * replaced in place by a deletion marker; the rest of the sentence stays. Such a
 * number cannot be told apart from an invented one, and once shown it is
 * remembered, so it is never shown, not even flagged.
 *
 * Detection works on the text as the page shows it (emphasis, code marks and link
 * syntax dropped, numeric entities decoded, full-width forms folded), because
 * "第[十九](…)条" and "第&#51;条" render as article numbers; the replacement lands
 * on the original Markdown that produced the flagged characters.
 */

import { articleStartsByLine } from '@/lib/extraction/article-lines';

export interface Evidence {
  id: string;
  kind: 'regulation' | 'user_document';
  /** Regulation name, or the selected document's file name. */
  name: string;
  articleNumber: string;
  documentId: string;
  fileUrl: string | null;
}

export const OUT_OF_LIBRARY_LABEL = '以下内容不是来自资料库，未经条款核对';
export const RETRIEVAL_FAILED_LABEL = '法规检索暂时失败，以下内容未经资料库核对';
export const REMOVED_MARKER = '〔未经核实的引用，已删去〕';

const NUMERAL = '[零〇一二三四五六七八九十百千两壹贰叁肆伍陆柒捌玖拾佰仟\\d]';
// [R3], [R 3], [D2], [R1, R2]; matched on shown text, where full-width forms are folded.
const ID = '[RD]\\s*\\d+';
const CITATION = new RegExp(`[[【]\\s*(${ID}(?:\\s*[,，、]\\s*${ID})*)\\s*[\\]】]`, 'g');
// Citations side by side ("[R1][R3]", "[R1]、[R3]") are shown as one list.
const CITATION_RUN = new RegExp(`${CITATION.source}(?:[ \\t]*、?[ \\t]*${CITATION.source})*`, 'g');
const ARTICLE_NUMBER = new RegExp(`第\\s*${NUMERAL}+\\s*条`, 'g');
// A paragraph, item or sub-article tacked onto a cited article is not part of the evidence.
const AFTER_CITATION = new RegExp(`^(\\s*)(第\\s*${NUMERAL}+\\s*[款项目]|之\\s*${NUMERAL})`);
// An id outside a well-formed citation: bare R3, a range [R1-R3].
const STRAY_ID = /(?<![A-Za-z0-9])[RD]\s*\d+/g;
// Gaps that join two flagged spans into one place: [R1-R3], "第五条、第六条".
const JOINING_GAP = /^[\s\-–—~～、，,和及与或至]{0,3}$/;
const BRACKET_PAIRS: Record<string, string> = { '[': ']', '［': '］', '【': '】', '(': ')', '（': '）' };

/** The text as the page shows it, with each shown character's source range. */
interface Shown {
  text: string;
  start: number[];
  end: number[];
  /** Source characters the page does not show (emphasis, code and link syntax). */
  markup: boolean[];
}

function render(src: string): Shown {
  const shown: Shown = { text: '', start: [], end: [], markup: new Array(src.length).fill(false) };
  const push = (ch: string, s: number, e: number) => {
    shown.text += ch;
    shown.start.push(s);
    shown.end.push(e);
  };
  let linkTextEnd = -1;
  let linkEnd = -1;
  for (let i = 0; i < src.length; ) {
    if (i === linkTextEnd) {
      for (let j = i; j < linkEnd; j++) shown.markup[j] = true;
      i = linkEnd;
      linkTextEnd = linkEnd = -1;
      continue;
    }
    const link = linkTextEnd < 0 && src[i] === '[' ? /^\[([^[\]\n]*)\]\(([^()\s]*)\)/.exec(src.slice(i)) : null;
    if (link) {
      shown.markup[i] = true;
      linkTextEnd = i + 1 + link[1].length;
      linkEnd = i + link[0].length;
      i += 1;
      continue;
    }
    if ('*_~`'.includes(src[i])) {
      shown.markup[i] = true;
      i += 1;
      continue;
    }
    const entity = src[i] === '&' ? /^&#(?:x([0-9a-f]+)|(\d+));/i.exec(src.slice(i)) : null;
    if (entity) {
      push(String.fromCodePoint(entity[1] ? parseInt(entity[1], 16) : Number(entity[2])), i, i + entity[0].length);
      i += entity[0].length;
      continue;
    }
    const ch = src[i];
    push(/[０-９ＲＤ［］]/.test(ch) ? String.fromCharCode(ch.charCodeAt(0) - 0xfee0) : ch, i, i + 1);
    i += 1;
  }
  return shown;
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

/** Widens a flagged source range over Markdown that wraps it on both sides (**…**, […](…)) or brackets around it. */
function widen(src: string, markup: boolean[], start: number, end: number): [number, number] {
  for (;;) {
    let left = start;
    let right = end;
    while (left > 0 && markup[left - 1]) left--;
    while (right < src.length && markup[right]) right++;
    if (left < start && right > end) {
      start = left;
      end = right;
      continue;
    }
    if (start > 0 && BRACKET_PAIRS[src[start - 1]] !== undefined && src[end] === BRACKET_PAIRS[src[start - 1]]) {
      start -= 1;
      end += 1;
      continue;
    }
    return [start, end];
  }
}

/** Where a label the model wrote at the very start ends, formatting included; -1 if none. */
function leadingLabelEnd(text: string): number {
  for (const label of [OUT_OF_LIBRARY_LABEL, RETRIEVAL_FAILED_LABEL]) {
    let i = 0;
    let matched = 0;
    while (i < text.length && matched < label.length) {
      if (/[*_~`#>\s]/.test(text[i])) i++;
      else if (text[i] === label[matched]) { i++; matched++; }
      else break;
    }
    if (matched === label.length) {
      while (i < text.length && /[*_~`\s：:，,。]/.test(text[i])) i++;
      return i;
    }
  }
  return -1;
}

/** "企业会计准则第22号-金融工具的确认和计量-2018" → "《企业会计准则第22号——金融工具的确认和计量》" */
export function citationName(regulationName: string): string {
  return `《${regulationName.replace(/-\d{4}$/, '').replace(/-/g, '——')}》`;
}

/** How a citation names its source: 《法规名》, or 《文件名》（您上传的文档）. */
export function sourceName(e: Evidence): string {
  return e.kind === 'regulation'
    ? citationName(e.name)
    : `《${e.name.replace(/\.[A-Za-z0-9]{1,5}$/, '')}》（您上传的文档）`;
}

const idsIn = (list: string) => list.split(/[,，、]/).map(id => id.replace(/\s+/g, ''));

export function finalizeAnswer(
  answer: string,
  context: { evidence: Evidence[]; regulationSearched: boolean; allRegulationSearchesFailed: boolean }
): { text: string; cited: Evidence[]; removed: number } {
  const byId = new Map(context.evidence.map(e => [e.id, e]));
  const cited = new Map<string, Evidence>();
  const shown = render(answer);
  const source = (a: number, b: number): [number, number] => [shown.start[a], shown.end[b - 1]];
  const edits: Edit[] = [];
  const taken: Array<[number, number]> = [];
  let removed = 0;
  const strike = (a: number, b: number) => {
    const [s, e] = widen(answer, shown.markup, ...source(a, b));
    edits.push({ start: s, end: e, text: REMOVED_MARKER });
    removed += 1;
  };

  for (const run of shown.text.matchAll(CITATION_RUN)) {
    const a = run.index!;
    const b = a + run[0].length;
    taken.push([a, b]);
    const ids = [...run[0].matchAll(CITATION)].flatMap(m => idsIn(m[1])).filter((id, i, all) => all.indexOf(id) === i);
    let previous: string | undefined;
    const parts = ids.filter(id => byId.has(id)).map(id => {
      const e = byId.get(id)!;
      cited.set(id, e);
      // Within one list, an article of the same source as the one before drops the name.
      const key = `${e.kind}:${e.name}`;
      const shownName = key === previous ? '' : sourceName(e);
      previous = key;
      return `${shownName}${e.articleNumber}`;
    });
    const unknown = ids.some(id => !byId.has(id));
    if (unknown) removed += 1;
    const [s, e] = source(a, b);
    edits.push({ start: s, end: e, text: [...parts, ...(unknown ? [REMOVED_MARKER] : [])].join('、') });

    const tail = AFTER_CITATION.exec(shown.text.slice(b));
    if (tail) {
      const ta = b + tail[1].length;
      const tb = b + tail[0].length;
      taken.push([ta, tb]);
      strike(ta, tb);
    }
  }

  const isTaken = (a: number, b: number) => taken.some(([s, e]) => a < e && b > s);
  const selfWritten = [...shown.text.matchAll(ARTICLE_NUMBER), ...shown.text.matchAll(STRAY_ID)]
    .map(m => [m.index!, m.index! + m[0].length] as [number, number])
    .filter(([a, b]) => !isTaken(a, b))
    .sort((x, y) => x[0] - y[0]);
  // One place: flagged spans that only a short joining gap separates ([R1-R3], 第五条、第六条).
  const places: Array<[number, number]> = [];
  for (const span of selfWritten) {
    const last = places[places.length - 1];
    if (last && JOINING_GAP.test(shown.text.slice(last[1], span[0]))) last[1] = Math.max(last[1], span[1]);
    else places.push([...span]);
  }
  for (const [a, b] of places) strike(a, b);

  edits.sort((x, y) => x.start - y.start);
  let text = '';
  let at = 0;
  for (const edit of edits) {
    if (edit.start < at) continue;
    text += answer.slice(at, edit.start) + edit.text;
    at = edit.end;
  }
  text = (text + answer.slice(at)).trim();

  const citedRegulation = [...cited.values()].some(e => e.kind === 'regulation');
  if (context.regulationSearched && !citedRegulation) {
    const label = context.allRegulationSearchesFailed ? RETRIEVAL_FAILED_LABEL : OUT_OF_LIBRARY_LABEL;
    const written = leadingLabelEnd(text);
    if (written >= 0) text = text.slice(written);
    text = `${label}\n\n${text.replace(/^[\s：:，,。]+/, '')}`.trim();
  }

  return { text, cited: [...cited.values()], removed };
}

export interface DocumentForNumbering {
  id: string;
  name: string;
  fileUrl: string | null;
  text: string;
}

/**
 * Gives every article of the selected documents an evidence id, D1, D2… across
 * all of them, written before the line that starts it. An article number that
 * starts more than one article within one document (an appendix numbered afresh)
 * gets no id: a citation of it could point at either. A document with no article
 * starts comes back unchanged.
 */
export function numberDocuments(documents: DocumentForNumbering[]): { texts: string[]; evidence: Evidence[] } {
  const evidence: Evidence[] = [];
  const texts = documents.map(doc => {
    const lines = doc.text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    const starts = articleStartsByLine(lines).map(start => start?.articleNumber ?? null);
    const count = new Map<string, number>();
    for (const n of starts) if (n) count.set(n, (count.get(n) ?? 0) + 1);
    return lines
      .map((line, i) => {
        const articleNumber = starts[i];
        if (!articleNumber || count.get(articleNumber)! > 1) return line;
        const id = `D${evidence.length + 1}`;
        evidence.push({ id, kind: 'user_document', name: doc.name, articleNumber, documentId: doc.id, fileUrl: doc.fileUrl });
        return `[${id}] ${line}`;
      })
      .join('');
  });
  return { texts, evidence };
}
