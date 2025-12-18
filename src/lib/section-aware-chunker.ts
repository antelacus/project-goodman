import { Section } from './section-parser';

export interface ChunkWithSection {
    content: string;
    chunkIndex: number;
    sectionTitle?: string;
    sectionLevel?: number;
    sectionPath?: string[];
}

/**
 * Splits content into chunks, attaching section metadata to each chunk.
 */
export function createSectionAwareChunks(
    content: string,
    sections: Section[],
    chunkSize: number = 1000,
    overlap: number = 100
): ChunkWithSection[] {
    const chunks: ChunkWithSection[] = [];

    // If no valid sections found or quality is too low, use basic chunking
    if (sections.length === 0) {
        return createBasicChunks(content, chunkSize, overlap);
    }

    // Iterate through sections and chunk each one independently
    // This ensures a chunk never crosses a major section boundary (cleaner context)
    let globalChunkIndex = 0;

    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];

        // Determine section content range
        const start = section.startIndex;
        const end = section.endIndex ?? content.length;

        // Safety check
        if (start >= end) continue;

        const sectionContent = content.slice(start, end);

        // Build section path (Parent -> Child)
        const sectionPath = buildSectionPath(section, sections);

        // Chunk this section's content
        const sectionChunks = createBasicChunks(
            sectionContent,
            chunkSize,
            overlap
        );

        // Attach metadata
        for (const chunk of sectionChunks) {
            chunks.push({
                ...chunk,
                chunkIndex: globalChunkIndex++,
                sectionTitle: section.title,
                sectionLevel: section.level,
                sectionPath: sectionPath,
            });
        }
    }

    // Handle any content BEFORE the first section (preamble)?
    // Usually minimal, but if the first section starts at index 1000, we missed 0-1000.
    if (sections.length > 0 && sections[0].startIndex > 0) {
        const preambleContent = content.slice(0, sections[0].startIndex);
        if (preambleContent.trim().length > 50) {
            const preambleChunks = createBasicChunks(preambleContent, chunkSize, overlap);
            // Prepend them
            const preambleWithMeta = preambleChunks.map(c => ({
                ...c,
                chunkIndex: 0, // Will be re-indexed if we cared about strict global order, but local index matches
            }));
            // Adjust existing indices
            chunks.forEach(c => c.chunkIndex += preambleChunks.length);
            chunks.unshift(...preambleWithMeta.map((c, idx) => ({ ...c, chunkIndex: idx })));
        }
    }

    return chunks;
}

/**
 * Helper to build the hierarchical path for a section
 */
function buildSectionPath(section: Section, allSections: Section[]): string[] {
    const path: string[] = [section.title];

    // Backtrack to find parents
    if (section.parent) {
        // Find the nearest preceding section that matches parent name and level-1
        // This is simple logic; for strict correctness we might need a tree structure,
        // but looking backwards in the array is usually sufficient ("closest previous parent")

        // Find index of current section
        const currentIdx = allSections.indexOf(section);

        // Search backwards
        for (let i = currentIdx - 1; i >= 0; i--) {
            const cand = allSections[i];
            if (cand.title === section.parent && cand.level === section.level - 1) {
                path.unshift(cand.title);

                // Recurse / Iterate for grandparent?
                if (cand.parent) {
                    // Basic recursion for 3 levels
                    // Simplified for now: just 2 levels or loop if deeply nested
                    // Let's assume max 3 levels for financial reports usually
                    // To be safe, we could make this recursive function properly, but let's stick to Design Doc logic
                    // Design doc logic was simple recursion.
                    const parentPath = buildSectionPath({ ...cand, parent: cand.parent }, allSections.slice(0, i + 1));
                    // Remove duplicate (the cand.title is already in path[0] of this recursion, but we just want its parents)
                    // buildSectionPath returns [Grandparent, Parent]. We have [Parent, Child].
                    // We want [Grandparent, Parent, Child].
                    path.shift(); // Remove 'Parent'
                    path.unshift(...parentPath);
                }
                break;
            }
        }
    }

    return path;
}

/**
 * Basic sliding window chunker
 */
function createBasicChunks(
    content: string,
    chunkSize: number,
    overlap: number
): ChunkWithSection[] {
    const chunks: ChunkWithSection[] = [];
    let start = 0;
    let index = 0;

    if (content.length === 0) return [];

    // Prevent infinite loop if chunkSize <= overlap
    if (chunkSize <= overlap) {
        chunkSize = overlap + 100;
    }

    while (start < content.length) {
        const end = Math.min(start + chunkSize, content.length);
        chunks.push({
            content: content.slice(start, end),
            chunkIndex: index++,
        });

        start = end - overlap;

        // Break if we've reached the end
        if (start >= content.length - overlap) break;
        // Safety break
        if (start >= content.length) break;
    }

    return chunks;
}
