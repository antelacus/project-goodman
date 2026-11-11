import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkCjkFriendly from 'remark-cjk-friendly/parseOnly';
import remarkCjkFriendlyGfmStrikethrough from 'remark-cjk-friendly-gfm-strikethrough/parseOnly';
import type { PluggableList } from 'unified';

/**
 * The Markdown syntax answers are written in. The chat page renders with it and
 * src/lib/citations reads with it: a syntax only one of them knows is a stretch
 * of text the two read differently, which is a way past the citation check.
 * Add a syntax plugin here, never in one place alone, and give the check a case
 * for every node type it brings.
 *
 * GFM: the model writes tables. The CJK plugins let ** and ~~ close after Chinese
 * punctuation (「**可以约定。**当事人」), which CommonMark alone does not; they go after GFM.
 */
export const ANSWER_SYNTAX: PluggableList = [remarkMath, remarkGfm, remarkCjkFriendly, remarkCjkFriendlyGfmStrikethrough];
