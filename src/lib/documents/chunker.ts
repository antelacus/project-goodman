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
 * Cuts fall at line ends, never inside a section from `sections`, and never
 * inside a GFM table: a table longer than `chunkSize` stays whole in one chunk,
 * so search never returns data rows without their header. A single line longer
 * than `chunkSize` is cut at sentence ends, or by length when it has none.
 */
export function createSectionAwareChunks(
    content: string,
    sections: Section[],
    chunkSize: number = DEFAULT_CHUNK_SIZE
): ChunkWithSection[] {
    if (content.length === 0) return [];

    const ordered = [...sections]
        .filter(s => s.startIndex > 0 && s.startIndex < content.length)
        .sort((a, b) => a.startIndex - b.startIndex);
    const starts = [0, ...ordered.map(s => s.startIndex)];

    const chunks: ChunkWithSection[] = [];
    starts.forEach((start, i) => {
        const end = i + 1 < starts.length ? starts[i + 1] : content.length;
        if (end <= start) return;
        const section = i === 0 ? sections.find(s => s.startIndex === 0) : ordered[i - 1];
        const path = section ? buildSectionPath(section, sections) : undefined;
        for (const piece of pack(blocks(content.slice(start, end)), chunkSize)) {
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

interface Block {
    text: string;
    table: boolean;
}

/** Lines with their line endings kept; a GFM table is one block. */
function blocks(text: string): Block[] {
    const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    const out: Block[] = [];
    for (let i = 0; i < lines.length; i++) {
        const header = lines[i];
        const delimiter = lines[i + 1];
        if (header.includes('|') && delimiter !== undefined && delimiter.includes('|') && DELIMITER_ROW.test(delimiter.trimEnd())) {
            let j = i + 2;
            while (j < lines.length && lines[j].trim() !== '' && lines[j].includes('|')) j++;
            out.push({ text: lines.slice(i, j).join(''), table: true });
            i = j - 1;
        } else {
            out.push({ text: header, table: false });
        }
    }
    return out;
}

/** Greedily fills chunks with whole blocks; only an over-long non-table line is cut. */
function pack(parts: Block[], size: number): string[] {
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

function splitLongLine(line: string, size: number): string[] {
    const sentences = line.match(/[^。！？!?]*[。！？!?]+|[^。！？!?]+$/g) ?? [line];
    const out: string[] = [];
    let current = '';
    for (const sentence of sentences) {
        if (current.length + sentence.length <= size) {
            current += sentence;
            continue;
        }
        if (current) out.push(current);
        current = '';
        for (let i = 0; i < sentence.length; i += size) {
            const slice = sentence.slice(i, i + size);
            if (slice.length === size) out.push(slice);
            else current = slice;
        }
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
