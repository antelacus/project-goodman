import { Section } from './parser';

export interface ChunkWithSection {
    content: string;
    chunkIndex: number;
    sectionTitle?: string;
    sectionLevel?: number;
    sectionPath?: string[];
}

const DEFAULT_CHUNK_SIZE = 1000;

/**
 * Splits a document into chunks that, joined in order with nothing in between,
 * are the document again: no overlap and nothing dropped. The selected-document
 * context and the article numbering read the document back by joining its chunks.
 *
 * Cuts fall at line ends (`\n`, `\r\n` or a lone `\r`), never inside a section
 * from `sections`, and never inside a GFM table: a table longer than `chunkSize`
 * stays whole in one chunk, so search never returns data rows without their
 * header, and a section that starts inside a table starts after it instead.
 * Lines inside a code fence are never a table. A single line longer than
 * `chunkSize` is cut at sentence ends, or by length when it has none.
 */
export function createSectionAwareChunks(
    content: string,
    sections: Section[],
    chunkSize: number = DEFAULT_CHUNK_SIZE
): ChunkWithSection[] {
    if (!Number.isInteger(chunkSize) || chunkSize < 2) {
        // 2: a hard cut must fit a surrogate pair.
        throw new RangeError(`chunkSize must be an integer of at least 2, got ${chunkSize}`);
    }
    if (content.length === 0) return [];

    const all = blocks(content);
    const sorted = [...sections].sort((a, b) => a.startIndex - b.startIndex);
    const starts = sectionStarts(content.length, sorted, all.filter(b => b.table));

    const chunks: ChunkWithSection[] = [];
    starts.forEach(({ start, section }, i) => {
        const end = i + 1 < starts.length ? starts[i + 1].start : content.length;
        const path = section ? buildSectionPath(section, sorted) : undefined;
        const parts = all
            .filter(b => b.start < end && b.start + b.text.length > start)
            .map(b => ({ ...b, text: content.slice(Math.max(b.start, start), Math.min(b.start + b.text.length, end)) }));
        for (const piece of pack(parts, chunkSize)) {
            chunks.push({
                content: piece,
                chunkIndex: chunks.length,
                ...(section && { sectionTitle: section.title, sectionLevel: section.level, sectionPath: path }),
            });
        }
    });
    return chunks;
}

const DELIMITER_ROW = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

interface Block {
    start: number;
    text: string;
    table: boolean;
}

/**
 * Where each section's chunks begin: the text before the first section belongs
 * to a section starting at 0, if any. A start inside a table moves to the
 * table's end; of starts that land on the same place, the last one wins.
 */
function sectionStarts(length: number, sorted: Section[], tables: Block[]): Array<{ start: number; section?: Section }> {
    const out: Array<{ start: number; section?: Section }> = [{ start: 0, section: sorted.find(s => s.startIndex === 0) }];
    for (const section of sorted) {
        let start = section.startIndex;
        if (start <= 0 || start >= length) continue;
        const table = tables.find(t => start > t.start && start < t.start + t.text.length);
        if (table) start = table.start + table.text.length;
        if (start >= length) continue;
        if (out[out.length - 1].start === start) out.pop();
        out.push({ start, section });
    }
    return out;
}

/** Lines with their line endings kept, and their offsets; a GFM table outside a code fence is one block. */
function blocks(text: string): Block[] {
    const lines = text.match(/[^\r\n]*(?:\r\n|\r|\n)|[^\r\n]+$/g) ?? [];
    const out: Block[] = [];
    let offset = 0;
    let fence: string | null = null;
    const push = (from: number, to: number, table: boolean) => {
        const blockText = lines.slice(from, to).join('');
        out.push({ start: offset, text: blockText, table });
        offset += blockText.length;
    };
    for (let i = 0; i < lines.length; i++) {
        const marker = FENCE.exec(lines[i])?.[1];
        if (fence) {
            if (marker && marker[0] === fence[0] && marker.length >= fence.length && lines[i].trim() === marker) fence = null;
            push(i, i + 1, false);
            continue;
        }
        if (marker) {
            fence = marker;
            push(i, i + 1, false);
            continue;
        }
        const header = lines[i];
        const delimiter = lines[i + 1];
        if (header.includes('|') && delimiter !== undefined && delimiter.includes('|') && DELIMITER_ROW.test(delimiter.trimEnd())) {
            let j = i + 2;
            while (j < lines.length && lines[j].trim() !== '' && lines[j].includes('|')) j++;
            push(i, j, true);
            i = j - 1;
        } else {
            push(i, i + 1, false);
        }
    }
    return out;
}

/** Greedily fills chunks with whole blocks; only an over-long non-table line is cut. */
function pack(parts: Array<Pick<Block, 'text' | 'table'>>, size: number): string[] {
    const out: string[] = [];
    let current = '';
    const flush = () => {
        if (current) out.push(current);
        current = '';
    };
    for (const { text, table } of parts) {
        if (current.length + text.length <= size) {
            current += text;
            continue;
        }
        flush();
        if (text.length <= size || table) {
            current = text;
        } else {
            const pieces = splitLongLine(text, size);
            out.push(...pieces.slice(0, -1));
            current = pieces[pieces.length - 1];
        }
    }
    flush();
    return out;
}

/**
 * Sentences with their ends kept. A sentence ends after a run of 。！？!?, or
 * after a full stop followed by whitespace or the end (so 3.14 is not an end);
 * whitespace after an end stays with the sentence it follows.
 */
function sentences(line: string): string[] {
    const out: string[] = [];
    let from = 0;
    let i = 0;
    while (i < line.length) {
        const ch = line[i];
        const endsHere = '。！？!?'.includes(ch) || (ch === '.' && (i + 1 === line.length || /\s/.test(line[i + 1])));
        i++;
        if (!endsHere) continue;
        while (i < line.length && '。！？!?.'.includes(line[i])) i++;
        while (i < line.length && /\s/.test(line[i])) i++;
        out.push(line.slice(from, i));
        from = i;
    }
    if (from < line.length) out.push(line.slice(from));
    return out;
}

function splitLongLine(line: string, size: number): string[] {
    const out: string[] = [];
    let current = '';
    for (const sentence of sentences(line)) {
        if (current.length + sentence.length <= size) {
            current += sentence;
            continue;
        }
        if (current) out.push(current);
        current = '';
        let i = 0;
        while (sentence.length - i > size) {
            let cut = i + size;
            // Never end a piece between the two halves of a surrogate pair.
            if (/[\uD800-\uDBFF]/.test(sentence[cut - 1])) cut -= 1;
            out.push(sentence.slice(i, cut));
            i = cut;
        }
        current = sentence.slice(i);
    }
    if (current) out.push(current);
    return out;
}

/** The section's ancestors and itself, nearest preceding parent first found. */
function buildSectionPath(section: Section, allSections: Section[]): string[] {
    const path = [section.title];
    let child = section;
    let index = allSections.indexOf(section);
    while (child.parent) {
        let found = -1;
        for (let i = index - 1; i >= 0; i--) {
            if (allSections[i].title === child.parent && allSections[i].level === child.level - 1) {
                found = i;
                break;
            }
        }
        if (found < 0) break;
        child = allSections[found];
        index = found;
        path.unshift(child.title);
    }
    return path;
}
