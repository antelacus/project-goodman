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
 * Detection works on the text as the page shows it, read with the parser the page
 * renders with (remark + ANSWER_SYNTAX): emphasis, code marks, link syntax and
 * reference definitions are not shown, table cells and footnotes are, character references are decoded, full-width
 * forms are folded, because "第[十九](…)条" and "第&#51;条" render as article
 * numbers. A replacement lands on the Markdown that produced the flagged
 * characters, widened over any formatting it would otherwise cut in two.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { ANSWER_SYNTAX } from '@/lib/markdown/answer-syntax';
import type { Nodes, Root } from 'mdast';
import { decodeNamedCharacterReference } from 'decode-named-character-reference';
import { decodeNumericCharacterReference } from 'micromark-util-decode-numeric-character-reference';
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
// A numeral may be broken by whitespace or a line end and still render as one number.
const NUMBER = `(?:${NUMERAL}\\s*)*${NUMERAL}`;
// [R3], [R 3], [D2], [R1, R2]; matched on shown text, where full-width forms are folded.
const ID = '[RD]\\s*\\d+';
const CITATION = new RegExp(`[[【]\\s*(${ID}(?:\\s*[,，、]\\s*${ID})*)\\s*[\\]】]`, 'g');
// Citations side by side ("[R1][R3]", "[R1]、[R3]") are shown as one list.
const CITATION_RUN = new RegExp(`${CITATION.source}(?:[ \\t]*、?[ \\t]*${CITATION.source})*`, 'g');
// Lists and ranges are one article reference: 第十一、十二条, 第五至七条, 第5-7条.
const ARTICLE_NUMBER = new RegExp(`第\\s*${NUMBER}(?:\\s*[、，,和及与或至到\\-–—~～]\\s*(?:第\\s*)?${NUMBER})*\\s*条`, 'g');
// A paragraph, item or sub-article tacked onto a cited article is not part of the
// evidence; each match is one more addition, bracketed or not.
const AFTER_CITATION = new RegExp(`^\\s*[（(]?\\s*(?:第\\s*${NUMBER}\\s*[款项目]|之\\s*${NUMBER})\\s*[)）]?`);
// An id outside a well-formed citation: bare R3, a range [R1-R3]. A bare D counts
// only when this question has D evidence: otherwise "D12" is a spreadsheet cell.
const strayIds = (withD: boolean) => (withD ? /(?<![A-Za-z0-9&])[RD]\d+(?!\d)/g : /(?<![A-Za-z0-9&])R\d+(?!\d)/g);
// Gaps that join two flagged spans into one place: [R1-R3], "第五条、第六条".
const JOINING_GAP = /^[\s\-–—~～、，,和及与或至]{0,3}$/;
const BRACKET_PAIRS: Record<string, string> = { '[': ']', '［': '］', '【': '】', '(': ')', '（': '）' };

// The page's syntax; not remark-breaks, which only turns a line end into a <br>:
// both are whitespace to detection, and its new nodes carry no source position.
const parser = unified().use(remarkParse).use(ANSWER_SYNTAX);

/** Separates blocks in the shown text: no pattern matches across it, so list items never merge. */
const BLOCK_END = '\u0000';
const CONTAINERS = new Set(['emphasis', 'strong', 'delete', 'link', 'linkReference', 'inlineCode', 'inlineMath']);
const INLINE = new Set([...CONTAINERS, 'text', 'break', 'html', 'image', 'imageReference', 'footnoteReference']);
const HIDDEN = new Set(['definition', 'thematicBreak']);
// Unicode format characters (zero-width space, word joiner, soft hyphen…) render as
// nothing, so to detection they are whitespace.
const FORMAT_CHARACTER = /\p{Cf}/gu;

/** The text as the page shows it, with each shown character's source range (-1 for a block separator). */
interface Shown {
  text: string;
  start: number[];
  end: number[];
  /** Inline formatting, as source range and the source range of what it shows. */
  containers: Array<{ from: number; to: number; innerFrom: number; innerTo: number }>;
}

/** A character reference as the parser decodes it ('&nbsp;' → U+00A0); itself when it is not one. */
function decodeReference(raw: string): string {
  const body = raw.slice(1, -1);
  if (body[0] !== '#') return decodeNamedCharacterReference(body) || raw;
  const hex = body[1] === 'x' || body[1] === 'X';
  return decodeNumericCharacterReference(body.slice(hex ? 2 : 1), hex ? 16 : 10);
}

/**
 * Pairs each code unit of a node's shown value with the source it came from:
 * escapes and character references map to their whole source, whitespace the
 * parser dropped (indentation, a line's container markers) is skipped. Null when
 * the two cannot be lined up.
 */
function align(src: string, from: number, to: number, value: string): Array<[number, number]> | null {
  const out: Array<[number, number]> = [];
  let j = from;
  for (let k = 0; k < value.length; ) {
    if (j >= to) return null;
    const c = src[j];
    if (c === '\\' && j + 1 < to && /[!-/:-@[-`{-~]/.test(src[j + 1]) && value[k] === src[j + 1]) {
      out.push([j, j + 2]);
      j += 2;
      k += 1;
      continue;
    }
    if (c === '&') {
      const raw = /^&(?:#[xX][0-9a-fA-F]+|#\d+|[A-Za-z][A-Za-z0-9]*);/.exec(src.slice(j, Math.min(to, j + 40)))?.[0];
      const decoded = raw ? decodeReference(raw) : undefined;
      if (raw && decoded !== raw && value.startsWith(decoded!, k)) {
        for (let n = 0; n < decoded!.length; n++) out.push([j, j + raw.length]);
        j += raw.length;
        k += decoded!.length;
        continue;
      }
    }
    if (c === value[k] || (/\s/.test(c) && /\s/.test(value[k]))) {
      out.push([j, j + 1]);
      j += 1;
      k += 1;
      continue;
    }
    if (/\s/.test(c) || (c === '>' && /\n[ \t>]*$/.test(src.slice(from, j)))) {
      j += 1;
      continue;
    }
    return null;
  }
  return out;
}

function render(src: string): Shown {
  const shown: Shown = { text: '', start: [], end: [], containers: [] };
  const push = (ch: string, s: number, e: number) => {
    shown.text += ch;
    shown.start.push(s);
    shown.end.push(e);
  };
  const literal = (value: string, from: number, at: number, to: number) => {
    const map = at >= from && at <= to ? align(src, at, to, value) : null;
    // Unalignable: every character maps to the whole node, so a replacement takes it all.
    for (let k = 0; k < value.length; k++) push(value[k], map ? map[k][0] : from, map ? map[k][1] : to);
  };
  /** Text shown apart from the flow (alt, title): separated, so no pattern joins it to its neighbours. */
  const shownAside = (value: string, at: number, to: number) => {
    push(BLOCK_END, -1, -1);
    const map = at < to ? align(src, at, to, value) : null;
    for (let k = 0; k < value.length; k++) push(value[k], map ? map[k][0] : at, map ? map[k][1] : to);
    push(BLOCK_END, -1, -1);
  };
  const visit = (node: Nodes, inline: boolean, parent: [number, number]) => {
    if (HIDDEN.has(node.type)) return;
    // A node a transform made without a position maps within its parent, never the whole answer.
    const from = node.position?.start.offset ?? parent[0];
    const to = node.position?.end.offset ?? parent[1];
    const block = !inline && !INLINE.has(node.type);
    if (block) push(BLOCK_END, -1, -1);
    const before = shown.text.length;
    if (node.type === 'break') push('\n', from, to);
    // Rendered as a superscript number: 第[^1]条 shows as an article number.
    else if (node.type === 'footnoteReference') push('1', from, to);
    else if (node.type === 'text' || node.type === 'html') literal(node.value, from, from, to);
    // A code node's value starts after its opening backticks or dollars, or after
    // its fence line (whose info string is not shown).
    else if (node.type === 'inlineCode' || node.type === 'inlineMath') literal(node.value, from, from + /^(`+|\$+)/.exec(src.slice(from))![0].length, to);
    else if (node.type === 'code' || node.type === 'math') {
      const fenced = /^[ \t]*(`{3,}|~{3,}|\$\$)/.test(src.slice(from));
      literal(node.value, from, fenced ? src.indexOf('\n', from) + 1 || to : from, to);
    }
    // Alt text shows when the image fails to load.
    else if (node.type === 'image' || node.type === 'imageReference') shownAside(node.alt ?? '', from + 2, to);
    else if ('children' in node) {
      const childrenInline = inline || ['paragraph', 'heading', 'tableCell'].includes(node.type) || CONTAINERS.has(node.type);
      for (const child of node.children) visit(child as Nodes, childrenInline, [from, to]);
    }
    // A title shows on hover.
    if ((node.type === 'link' || node.type === 'image') && node.title) {
      const at = src.lastIndexOf(node.title, to);
      shownAside(node.title, at >= from ? at : from, to);
    }
    if (CONTAINERS.has(node.type)) {
      const starts = shown.start.slice(before).filter(n => n >= 0);
      if (starts.length) shown.containers.push({ from, to, innerFrom: Math.min(...starts), innerTo: Math.max(...shown.end.slice(before)) });
    }
    if (block) push(BLOCK_END, -1, -1);
  };
  visit(parser.runSync(parser.parse(src)) as Root, false, [0, src.length]);
  shown.text = shown.text
    .replace(/[０-９ＲＤ［］]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(FORMAT_CHARACTER, ch => ' '.repeat(ch.length));
  return shown;
}

interface Edit {
  start: number;
  end: number;
  text: string;
  /** The evidence a citation edit shows; it counts as cited only if the edit survives. */
  ids?: string[];
}

/** Widening can make edits overlap: they merge into the first, which keeps its text and evidence, plus one marker. */
function mergeEdits(edits: Edit[]): Edit[] {
  const merged: Edit[] = [];
  for (const edit of [...edits].sort((x, y) => x.start - y.start || y.end - x.end)) {
    const last = merged[merged.length - 1];
    if (last && edit.start < last.end) {
      last.end = Math.max(last.end, edit.end);
      if (edit.text.includes(REMOVED_MARKER) && !last.text.includes(REMOVED_MARKER)) last.text += REMOVED_MARKER;
    } else {
      merged.push({ ...edit });
    }
  }
  return merged;
}

/**
 * The source of shown characters [a, b), widened over formatting the range does
 * not sit strictly inside (so "**第九**条" goes whole, not leaving "**") and over
 * brackets around it.
 */
function sourceOf(src: string, shown: Shown, a: number, b: number): [number, number] {
  let start = Infinity;
  let end = -Infinity;
  for (let i = a; i < b; i++) {
    if (shown.start[i] < 0) continue;
    start = Math.min(start, shown.start[i]);
    end = Math.max(end, shown.end[i]);
  }
  for (let changed = true; changed; ) {
    changed = false;
    for (const c of shown.containers) {
      const overlaps = start < c.to && end > c.from;
      const strictlyInside = start >= c.innerFrom && end <= c.innerTo && !(start <= c.innerFrom && end >= c.innerTo);
      if (overlaps && !strictlyInside && (c.from < start || c.to > end)) {
        start = Math.min(start, c.from);
        end = Math.max(end, c.to);
        changed = true;
      }
    }
    if (start > 0 && BRACKET_PAIRS[src[start - 1]] !== undefined && src[end] === BRACKET_PAIRS[src[start - 1]]) {
      start -= 1;
      end += 1;
      changed = true;
    }
  }
  return [start, end];
}

/** Where a label the model wrote at the very start of the shown text ends, punctuation after it included; -1 if none. */
function leadingLabelEnd(text: string): number {
  const at = /^[\s\u0000]*/.exec(text)![0].length;
  for (const label of [OUT_OF_LIBRARY_LABEL, RETRIEVAL_FAILED_LABEL]) {
    if (text.startsWith(label, at)) return at + label.length + /^[\s：:，,。]*/.exec(text.slice(at + label.length))![0].length;
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
  const shown = render(answer);
  const edits: Edit[] = [];
  const taken: Array<[number, number]> = [];
  const strike = (a: number, b: number) => {
    const [start, end] = sourceOf(answer, shown, a, b);
    edits.push({ start, end, text: REMOVED_MARKER });
  };

  for (const run of shown.text.matchAll(CITATION_RUN)) {
    const a = run.index!;
    const b = a + run[0].length;
    taken.push([a, b]);
    const ids = [...run[0].matchAll(CITATION)].flatMap(m => idsIn(m[1])).filter((id, i, all) => all.indexOf(id) === i);
    let previous: string | undefined;
    const valid = ids.filter(id => byId.has(id));
    const parts = valid.map(id => {
      const e = byId.get(id)!;
      // Within one list, an article of the same source as the one before drops the name.
      const key = `${e.kind}:${e.name}`;
      const shownName = key === previous ? '' : sourceName(e);
      previous = key;
      return `${shownName}${e.articleNumber}`;
    });
    const unknown = ids.some(id => !byId.has(id));
    const [start, end] = sourceOf(answer, shown, a, b);
    edits.push({ start, end, text: [...parts, ...(unknown ? [REMOVED_MARKER] : [])].join('、'), ids: valid });

    // Everything tacked on after it is one place: 第二款第三项 goes whole.
    let tailEnd = b;
    for (let tail; (tail = AFTER_CITATION.exec(shown.text.slice(tailEnd))); ) tailEnd += tail[0].length;
    if (tailEnd > b) {
      const ta = b + /^\s*/.exec(shown.text.slice(b))![0].length;
      taken.push([ta, tailEnd]);
      strike(ta, tailEnd);
    }
  }

  const isTaken = (a: number, b: number) => taken.some(([s, e]) => a < e && b > s);
  const selfWritten = [...shown.text.matchAll(ARTICLE_NUMBER), ...shown.text.matchAll(strayIds(context.evidence.some(e => e.kind === 'user_document')))]
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

  let merged = mergeEdits(edits);
  const cited = [...new Set(merged.flatMap(e => e.ids ?? []))].map(id => byId.get(id)!);
  const citedRegulation = cited.some(e => e.kind === 'regulation');
  const label = context.regulationSearched && !citedRegulation
    ? (context.allRegulationSearchesFailed ? RETRIEVAL_FAILED_LABEL : OUT_OF_LIBRARY_LABEL)
    : null;
  const written = label ? leadingLabelEnd(shown.text) : -1;
  if (written >= 0) merged = mergeEdits([...merged, { start: 0, end: sourceOf(answer, shown, 0, written)[1], text: '' }]);

  let text = '';
  let at = 0;
  for (const edit of merged) {
    text += answer.slice(at, edit.start) + edit.text;
    at = edit.end;
  }
  text = (text + answer.slice(at)).trim();
  const removed = merged.filter(e => e.text.includes(REMOVED_MARKER)).length;

  if (label) text = `${label}\n\n${text.replace(/^[\s：:，,。]+/, '')}`.trim();
  return { text, cited, removed };
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
