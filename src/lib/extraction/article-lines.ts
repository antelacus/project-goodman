/**
 * What counts as the start of an article ("第X条"), shared by the regulation
 * splitter and the numbering of a user's own documents (citations): one
 * definition, so the two cannot drift. Whether numbers must run in order and what
 * a repeated number means is each caller's rule, not this module's.
 *
 * Only a line that begins with "第X条" can start an article; in-text references
 * ("按照本准则第二十五条的规定") can land at the start of a line after a wrap. A
 * heading is told apart by a space (or nothing) after "第X条"; PDFs that print no
 * space (the 2007 standards) need two other signals together: the previous line
 * ended a sentence or was a chapter heading (a wrap leaves it mid-sentence:
 * "……按照本准则"), and the word after "第X条" does not continue a reference
 * (的、规定、所、第…款…). Chinese numerals only: the library prints no "第1条".
 */

const ARTICLE_LINE = /^第([零〇一二三四五六七八九十百千]+)条(.?)/;
const HEADING_LINE = /^第[零〇一二三四五六七八九十百千]+[编章节](\s|$)/;
// What follows "第X条" when it is a reference rather than a heading.
const REFERENCE_CONTINUATION = /^[的规所中和或、，。；：至第款项（(之]/;
// A line that leaves no sentence open, so a "第X条" on the next line is a fresh start.
const SENTENCE_END = /[。：；:;」）)]$/;

export interface ArticleStart {
  number: number;
  /** As written, e.g. "第一百零五条". */
  articleNumber: string;
  /** "第X条" is followed by whitespace or ends the line. */
  spaced: boolean;
  /** The previous line was empty, ended a sentence, or was a chapter/section heading. */
  afterSentence: boolean;
  /** The line reads as an article heading rather than a wrapped reference. */
  heading: boolean;
}

/** The article a line would start, judged with the line before it (trimmed); null if it begins with no "第X条". */
export function articleStart(line: string, previous: string): ArticleStart | null {
  const match = line.match(ARTICLE_LINE);
  if (!match) return null;
  const spaced = match[2] === '' || /\s/.test(match[2]);
  const afterSentence = followsFinishedSentence(previous);
  return {
    number: chineseToNumber(match[1]),
    articleNumber: `第${match[1]}条`,
    spaced,
    afterSentence,
    heading: spaced || (afterSentence && !REFERENCE_CONTINUATION.test(match[2])),
  };
}

/** The previous line (trimmed) leaves no sentence open: empty, a sentence end, or a chapter/section heading. */
export function followsFinishedSentence(previous: string): boolean {
  return previous === '' || SENTENCE_END.test(previous) || HEADING_LINE.test(previous);
}

/** A 编、章 or 节 heading ("第一章 总则"). */
export function isHeadingLine(line: string): boolean {
  return HEADING_LINE.test(line);
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
