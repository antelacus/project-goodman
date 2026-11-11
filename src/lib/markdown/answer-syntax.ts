import remarkMath from 'remark-math';
import type { PluggableList } from 'unified';

/**
 * The Markdown syntax answers are written in. The chat page renders with it and
 * src/lib/citations reads with it: a syntax only one of them knows is a stretch
 * of text the two read differently, which is a way past the citation check.
 * Add a syntax plugin here, never in one place alone.
 */
export const ANSWER_SYNTAX: PluggableList = [remarkMath];
