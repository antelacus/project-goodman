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

const CITATION = /[[【]\s*(R\d+(?:\s*[,，、]\s*R\d+)*)\s*[\]】]/g;
const ARTICLE_NUMBER = /第\s*[零〇一二三四五六七八九十百千\d]+\s*条/;
// A sentence: up to and including its end mark, or a run without one; newlines stand alone.
const SEGMENT = /[^。！？\n]*[。！？]|[^。！？\n]+|\n/g;

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

  const kept = (answer.match(SEGMENT) ?? []).map(segment => {
    if (segment === '\n') return segment;
    const ids = [...segment.matchAll(CITATION)].flatMap(m => m[1].split(/\s*[,，、]\s*/));
    if (ARTICLE_NUMBER.test(segment) || ids.some(id => !byId.has(id))) {
      removed += 1;
      return '';
    }
    return segment.replace(CITATION, (_, list: string) =>
      list
        .split(/\s*[,，、]\s*/)
        .map(id => {
          const e = byId.get(id)!;
          cited.set(id, e);
          return `${citationName(e.regulationName)}${e.articleNumber}`;
        })
        .join('、')
    );
  });

  let text = kept.join('').replace(/\n{3,}/g, '\n\n').trim();

  if (context.regulationSearched && cited.size === 0) {
    const label = context.allSearchesFailed ? RETRIEVAL_FAILED_LABEL : OUT_OF_LIBRARY_LABEL;
    for (const l of [OUT_OF_LIBRARY_LABEL, RETRIEVAL_FAILED_LABEL]) text = text.split(l).join('');
    text = `${label}\n\n${text.replace(/^[\s：:，,。]+/, '')}`.trim();
  }
  if (removed > 0) {
    text = `${text}\n\n（已删去 ${removed} 处未经资料库核实的条款引用）`;
  }

  return { text, cited: [...cited.values()], removed };
}
