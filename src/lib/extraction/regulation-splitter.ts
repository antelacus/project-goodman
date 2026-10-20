/**
 * Regulation text (one string per PDF page) → articles + anomalies (REQ §5.6).
 *
 * An article starts only at a line that begins with "第X条". In-text references
 * ("按照本准则第二十五条的规定") can land at the start of a line after a wrap. A
 * heading is told apart by a space after "第X条"; PDFs that print no space (the
 * 2007 standards) need two other signals together: the previous line ended a
 * sentence (a wrap leaves it mid-sentence: "……按照本准则"), and the word after
 * "第X条" does not continue a reference (的、规定、所、第…款…).
 * Numbers must run one by one: a number that jumps ahead still starts an article
 * (the source may skip one; refusing it would fold every later article into the
 * previous one), a repeated or earlier number does not. Both are reported, as is
 * a space-less line-start "第X条" carrying the next number, so nothing is
 * silently kept or dropped; the anomalies go to Jason before any replacement.
 *
 * Page-number lines and running headers/footers are dropped (once newlines are
 * removed for search, a page number would glue into a word); chapter and section
 * headings are not part of any article's content. Kangxi radicals, which some
 * PDFs print in place of look-alike ideographs ("⼀" for "一", "⼈" for "人"), are
 * mapped to the ideographs, and a justified line printed with a space between
 * every character ("第 十 条 职 工") is closed up; otherwise neither the article
 * numbers nor a keyword search would match them.
 */

export interface SplitArticle {
  number: number;
  /** As written in the source, e.g. "第一百零五条". */
  articleNumber: string;
  /** Starts with the article number; original line breaks kept. */
  content: string;
  /** Chapter and section headings in force, e.g. ["第一章 总则"]. */
  hierarchy: string[];
  firstPage: number;
  lastPage: number;
}

export type SplitAnomaly =
  | { kind: 'page_count_mismatch'; expected: number; extracted: number }
  | { kind: 'empty_page'; page: number }
  | { kind: 'no_articles' }
  | { kind: 'skipped_number'; page: number; line: string; expected: number; found: number }
  | { kind: 'repeated_number'; page: number; line: string; articleNumber: string }
  | { kind: 'next_number_as_reference'; page: number; line: string }
  | { kind: 'unspaced_skip'; page: number; line: string; expected: number; found: number }
  | { kind: 'appendix_after_articles'; page: number; line: string };

export interface SplitResult {
  articles: SplitArticle[];
  anomalies: SplitAnomaly[];
}

const ARTICLE_LINE = /^第([零〇一二三四五六七八九十百千]+)条(.?)/;
const HEADING_LINE = /^第[零〇一二三四五六七八九十百千]+[编章节](\s|$)/;
const APPENDIX_LINE = /^(附录|附件|附表)/;
// What follows "第X条" when it is a reference rather than a heading.
const REFERENCE_CONTINUATION = /^[的规所中和或、，。；：至第款项（(之]/;
// A line that leaves no sentence open, so a "第X条" on the next line is a fresh start.
const SENTENCE_END = /[。：；:;」）)]$/;
const PAGE_NUMBER_LINE = /^[-—\s]*((第\s*)?\d+(\s*页)?|\d+\s*\/\s*\d+)[-—\s]*$/;

export function splitRegulation(pages: string[], expectedPageCount: number): SplitResult {
  const anomalies: SplitAnomaly[] = [];
  if (pages.length !== expectedPageCount) {
    return {
      articles: [],
      anomalies: [{ kind: 'page_count_mismatch', expected: expectedPageCount, extracted: pages.length }],
    };
  }

  const pageLines = stripRunningLines(pages.map(toLines));
  pageLines.forEach((lines, i) => {
    if (lines.length === 0) anomalies.push({ kind: 'empty_page', page: i + 1 });
  });

  const articles: SplitArticle[] = [];
  let hierarchy: string[] = [];
  let current: { article: SplitArticle; lines: string[] } | null = null;
  let inAppendix = false;

  const close = () => {
    if (current) {
      current.article.content = current.lines.join('\n');
      articles.push(current.article);
      current = null;
    }
  };

  let previous = '';
  pageLines.forEach((lines, pageIndex) => {
    const page = pageIndex + 1;
    for (const line of lines) {
      if (inAppendix) continue;
      const afterSentence = previous === '' || SENTENCE_END.test(previous) || HEADING_LINE.test(previous);
      previous = line;

      const articleMatch = line.match(ARTICLE_LINE);
      if (articleMatch) {
        const found = chineseToNumber(articleMatch[1]);
        const expected = (current?.article.number ?? articles[articles.length - 1]?.number ?? 0) + 1;
        const spaced = articleMatch[2] === '' || /\s/.test(articleMatch[2]);
        const unspacedHeading = !spaced && afterSentence && !REFERENCE_CONTINUATION.test(articleMatch[2]);

        const startsArticle = (spaced || unspacedHeading) && found >= expected;
        if (startsArticle) {
          if (found > expected) anomalies.push({ kind: 'skipped_number', page, line, expected, found });
          close();
          current = {
            article: {
              number: found,
              articleNumber: `第${articleMatch[1]}条`,
              content: '',
              hierarchy,
              firstPage: page,
              lastPage: page,
            },
            lines: [line],
          };
          continue;
        }
        if (spaced) {
          anomalies.push({ kind: 'repeated_number', page, line, articleNumber: `第${articleMatch[1]}条` });
        } else if (found === expected) {
          anomalies.push({ kind: 'next_number_as_reference', page, line });
        } else if (found > expected && afterSentence) {
          anomalies.push({ kind: 'unspaced_skip', page, line, expected, found });
        }
        // Otherwise a wrapped in-text reference: ordinary content.
      }

      if (!current) {
        // Preamble (title, issuing notice) and headings before the first article.
        if (HEADING_LINE.test(line)) hierarchy = nextHierarchy(hierarchy, line);
        continue;
      }

      if (HEADING_LINE.test(line)) {
        hierarchy = nextHierarchy(hierarchy, line);
        continue;
      }
      if (APPENDIX_LINE.test(line)) {
        anomalies.push({ kind: 'appendix_after_articles', page, line });
        inAppendix = true;
        continue;
      }
      current.lines.push(line);
      current.article.lastPage = page;
    }
  });
  close();

  if (articles.length === 0) anomalies.push({ kind: 'no_articles' });
  return { articles, anomalies };
}

const SPACED_IDEOGRAPHS = /(?<=[\u4e00-\u9fff])[ \u3000]+(?=[\u4e00-\u9fff])/g;

/** Closes up a letter-spaced line; one stray space between two characters is left alone. */
function closeUpLetterSpacing(line: string): string {
  return (line.match(SPACED_IDEOGRAPHS)?.length ?? 0) >= 3 ? line.replace(SPACED_IDEOGRAPHS, '') : line;
}

function toLines(page: string): string[] {
  return normalizeIdeographs(page)
    .split('\n')
    .map(l => closeUpLetterSpacing(l.trim()))
    .filter(l => l !== '' && !PAGE_NUMBER_LINE.test(l));
}

/**
 * Drops a running header or footer: a line that opens or closes most pages, or
 * one that recurs anywhere on most pages (browser-printed PDFs put the print
 * timestamp and a URL with "3/10" in varying places). Digits are ignored when
 * comparing, since page counters change; the anywhere rule skips short lines
 * ("（一）"), which recur in the body legitimately.
 */
function stripRunningLines(pages: string[][]): string[][] {
  if (pages.length < 3) return pages;
  const key = (line: string) => line.replace(/\d+/g, '#');
  const edgeCounts = new Map<string, number>();
  const anywhereCounts = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const lines of pages) {
    for (const k of new Set([lines[0], lines[lines.length - 1]].filter(l => l !== undefined).map(key))) bump(edgeCounts, k);
    for (const k of new Set(lines.filter(l => l.length >= 8).map(key))) bump(anywhereCounts, k);
  }
  const most = (m: Map<string, number>) => [...m].filter(([, n]) => n > pages.length / 2).map(([k]) => k);
  const running = new Set([...most(edgeCounts), ...most(anywhereCounts)]);
  return pages.map(lines =>
    lines.filter((l, i) => {
      const k = key(l);
      if (!running.has(k)) return true;
      const atEdge = i === 0 || i === lines.length - 1;
      return !(atEdge || anywhereCounts.get(k)! > pages.length / 2);
    })
  );
}

// Where a PDF's radical stands for a different ideograph than its NFKC form:
// the browser-printed laws print "口" as "⼜" (U+2F1C, the radical of 又); in
// all 98 occurrences across the library it reads 出口, 进口 or 敞口. Keep in step
// with public.search_normalize.
const RADICAL_OVERRIDES: Record<string, string> = { '⼜': '口' };

/** Kangxi radicals and CJK radicals supplement → the unified ideographs they render as. */
export function normalizeIdeographs(text: string): string {
  return text.replace(/[\u2E80-\u2FDF]/g, ch => RADICAL_OVERRIDES[ch] ?? ch.normalize('NFKC'));
}

const HEADING_LEVEL: Record<string, number> = { 编: 0, 章: 1, 节: 2 };

function headingLevel(heading: string): number {
  return HEADING_LEVEL[heading.match(/^第[^编章节]+([编章节])/)![1]];
}

/** A heading replaces any heading at its level or below: a new 章 drops the old 章 and 节. */
function nextHierarchy(hierarchy: string[], heading: string): string[] {
  const level = headingLevel(heading);
  return [...hierarchy.filter(h => headingLevel(h) < level), heading];
}

const DIGITS: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const UNITS: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };

/** "一百零五" → 105, "十二" → 12. Returns NaN for anything malformed. */
export function chineseToNumber(text: string): number {
  let total = 0;
  let digit: number | null = null;
  for (const ch of text) {
    if (ch in DIGITS) {
      digit = DIGITS[ch];
    } else if (ch in UNITS) {
      total += (digit ?? 1) * UNITS[ch];
      digit = null;
    } else {
      return NaN;
    }
  }
  return total + (digit ?? 0);
}
