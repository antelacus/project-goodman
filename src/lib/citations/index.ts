/**
 * Answer post-processing: where article numbers in an answer come from (REQ §5.4, §5.5).
 *
 * The model cites a search result only by its evidence id ("[R3]"); this module
 * turns valid ids into 《法规名》第X条, so an article number shown to the user is
 * always one a search returned. Any sentence holding an unknown id or an article
 * number the model wrote itself is removed and counted: such a number cannot be
 * told apart from an invented one. That also removes a sentence quoting an
 * article's own cross-reference ("按照本准则第二十五条"), an accepted cost.
 */

export interface Evidence {
  id: string;
  regulationName: string;
  articleNumber: string;
  documentId: string;
  fileUrl: string | null;
}

export const OUT_OF_LIBRARY_LABEL = '以下内容不是来自资料库，未经条款核对';
export const RETRIEVAL_FAILED_LABEL = '法规检索暂时失败，以下内容未经资料库核对';

const NUMERAL = '[零〇一二三四五六七八九十百千两壹贰叁肆伍陆柒捌玖拾佰仟\\d]';
// [R3], [R 3], ［R3］, [R1, R2]; ids are compared without spaces or full-width forms.
const CITATION = /[[【［]\s*([RＲ]\s*[\d０-９]+(?:\s*[,，、]\s*[RＲ]\s*[\d０-９]+)*)\s*[\]】］]/g;
// Citations side by side ("[R1][R3]", "[R1]、[R3]") are shown as one list.
const CITATION_RUN = new RegExp(`${CITATION.source}(?:[ \\t]*、?[ \\t]*${CITATION.source})*`, 'g');
const ARTICLE_NUMBER = new RegExp(`第\\s*${NUMERAL}+\\s*条`);
// A paragraph, item or sub-article tacked onto a cited article is not part of the evidence.
const AFTER_CITATION = new RegExp(`^\\s*(第\\s*${NUMERAL}+\\s*[款项目]|之\\s*${NUMERAL})`);
// An id outside a well-formed citation: bare R3, a range [R1-R3].
const STRAY_ID = /(?<![A-Za-z0-9])R\s*\d+/;
// A line continues the previous one unless the previous ended a sentence or a
// clause, or either is Markdown structure (list item, heading, table, quote, fence).
const STRUCTURE_LINE = /^\s*([-*+]\s|\d+[.、)]|#|\||>|```)/;
const LINE_END = /[。！？!?：:|]\s*$/;
const SENTENCE = /[^。！？]*[。！？]|[^。！？]+/g;

/**
 * The text as the page shows it, for checking only: Markdown emphasis and code
 * marks dropped, numeric entities decoded, full-width digits and letters folded.
 * "第**十九**条" and "第&#51;条" render as article numbers, so they are checked as such.
 */
function rendered(text: string): string {
  return text
    .replace(/[*_~`]/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/[０-９Ｒ［］]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

const idOf = (raw: string) => rendered(raw).replace(/\s+/g, '');
const idsIn = (list: string) => list.split(/[,，、]/).map(idOf);

/** Lines joined into units that each hold whole sentences. */
function units(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const prev = out.length > 0 ? out[out.length - 1] : undefined;
    const lastLine = prev?.split('\n').pop() ?? '';
    const continues =
      prev !== undefined && line.trim() !== '' && lastLine.trim() !== '' &&
      !LINE_END.test(lastLine) && !STRUCTURE_LINE.test(line) && !STRUCTURE_LINE.test(lastLine);
    if (continues) out[out.length - 1] = `${prev}\n${line}`;
    else out.push(line);
  }
  return out;
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

export function finalizeAnswer(
  answer: string,
  context: { evidence: Evidence[]; regulationSearched: boolean; allSearchesFailed: boolean }
): { text: string; cited: Evidence[]; removed: number } {
  const byId = new Map(context.evidence.map(e => [e.id, e]));
  const cited = new Map<string, Evidence>();
  let removed = 0;

  const check = (sentence: string): string => {
    const shown = rendered(sentence);
    const citations = [...sentence.matchAll(CITATION)];
    const ids = citations.flatMap(m => idsIn(m[1]));
    const selfWritten =
      ARTICLE_NUMBER.test(shown) ||
      STRAY_ID.test(rendered(sentence.replace(CITATION, ''))) ||
      citations.some(m => AFTER_CITATION.test(rendered(sentence.slice(m.index! + m[0].length)))) ||
      ids.some(id => !byId.has(id));
    if (selfWritten) {
      removed += 1;
      return '';
    }
    return sentence.replace(CITATION_RUN, run => {
      let previous: string | undefined;
      return [...run.matchAll(CITATION)]
        .flatMap(m => idsIn(m[1]))
        .filter((id, i, all) => all.indexOf(id) === i)
        .map(id => {
          const e = byId.get(id)!;
          cited.set(id, e);
          // Within one list, an article of the same regulation as the one before drops the name.
          const shown = e.regulationName === previous ? e.articleNumber : `${citationName(e.regulationName)}${e.articleNumber}`;
          previous = e.regulationName;
          return shown;
        })
        .join('、');
    });
  };

  const kept = units(answer).map(unit => (unit.match(SENTENCE) ?? []).map(check).join(''));
  let text = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  if (context.regulationSearched && cited.size === 0) {
    const label = context.allSearchesFailed ? RETRIEVAL_FAILED_LABEL : OUT_OF_LIBRARY_LABEL;
    const written = leadingLabelEnd(text);
    if (written >= 0) text = text.slice(written);
    text = `${label}\n\n${text.replace(/^[\s：:，,。]+/, '')}`.trim();
  }
  if (removed > 0) {
    text = `${text}\n\n（已删去 ${removed} 处未经资料库核实的条款引用）`;
  }

  return { text, cited: [...cited.values()], removed };
}
