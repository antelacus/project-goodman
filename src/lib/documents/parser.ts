

export interface Section {
    title: string;
    level: number;           // 1, 2, 3...
    startIndex: number;      // index in original content
    endIndex?: number;       // index in original content
    parent?: string;         // title of parent section
}

export interface ParseResult {
    sections: Section[];
    quality: 'good' | 'moderate' | 'basic';
    hasToc: boolean;
    method: 'toc' | 'heading' | 'basic';
}

// Regex Patterns for Chinese Financial Reports
const HEADING_PATTERNS = {
    // Level 1: "一、", "第一章"
    level1: [
        /^[一二三四五六七八九十]+、/,                           // 一、
        /^第[一二三四五六七八九十]+[章节部分]/,                  // 第一章
    ],
    // Level 2: "（一）", "(一)", "1."
    level2: [
        /^（[一二三四五六七八九十]+）/,                          // （一）
        /^\([一二三四五六七八九十]+\)/,                          // (一)
        /^[1-9]\./,                                              // 1.
    ],
    // Level 3: "1.1", "（1）", "(1)"
    level3: [
        /^[1-9]\.[1-9]/,                                         // 1.1
        /^（[1-9]）/,                                            // （1）
        /^\([1-9]\)/,                                            // (1)
    ],
};

/**
 * Main entry point for section parsing
 */
export async function parseDocumentSections(
    content: string,
): Promise<ParseResult> {
    // 1. Try Table of Contents (TOC) detection first
    const tocResult = detectTableOfContents(content);
    if (tocResult.found && tocResult.sections.length >= 5) {
        return {
            sections: calculateEndIndices(tocResult.sections, content.length),
            quality: tocResult.sections.length >= 10 ? 'good' : 'moderate',
            hasToc: true,
            method: 'toc',
        };
    }

    // 2. Fallback to Heading Pattern detection
    const headingResult = detectHeadingPatterns(content);
    if (headingResult.sections.length >= 5) {
        return {
            sections: calculateEndIndices(headingResult.sections, content.length),
            quality: headingResult.sections.length >= 10 ? 'good' : 'moderate',
            hasToc: false,
            method: 'heading',
        };
    }

    // 3. Fallback to Basic (no structure)
    return {
        sections: [],
        quality: 'basic',
        hasToc: false,
        method: 'basic',
    };
}

/**
 * Detects sections based on a Table of Contents (TOC)
 */
function detectTableOfContents(content: string): {
    found: boolean;
    sections: Section[]
} {
    // Look for common TOC markers
    const tocMarkers = ['目录', '目 录', 'CONTENTS', 'Table of Contents'];
    let tocIndex = -1;

    for (const marker of tocMarkers) {
        // Check first 5000 chars roughly for TOC
        const idx = content.indexOf(marker);
        if (idx !== -1 && idx < 5000) {
            // Find the first occurrence
            if (tocIndex === -1 || idx < tocIndex) {
                tocIndex = idx;
            }
        }
    }

    if (tocIndex === -1) return { found: false, sections: [] };

    // Heuristic: Analyze TOC content (next ~2000 chars after marker)
    // Limitation: This assumes TOC is text-extractable and relatively contiguous
    const tocContentRange = content.slice(tocIndex, tocIndex + 3000);
    const sections: Section[] = [];

    const lines = tocContentRange.split('\n');
    let validTocLines = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // A TOC line usually looks like "一、公司简介 ........ 4"
        // Or just a title, but we need to match it back to the body content

        // Simplistic Logic: If it matches a Level 1 pattern, try to find it in the REST of the body
        for (const pattern of HEADING_PATTERNS.level1) {
            if (pattern.test(trimmed)) {
                // Extract pure title (remove dots and page numbers)
                // e.g., "一、公司简介......4" -> "一、公司简介"
                const cleanTitle = trimmed.replace(/[…\.。 ]+\d*$/, '').trim();

                // Find this title in the BODY (after the TOC area)
                // We start searching after the TOC area to avoid finding the TOC entry itself
                const searchStart = tocIndex + 3000;
                const realIndex = content.indexOf(cleanTitle, searchStart);

                if (realIndex !== -1) {
                    sections.push({
                        title: cleanTitle,
                        level: 1,
                        startIndex: realIndex
                    });
                    validTocLines++;
                }
                break;
            }
        }

        // If we have found enough sections, we can trust this is a TOC
        if (validTocLines > 20) break; // Optimization
    }

    return { found: sections.length > 0, sections };
}

/**
 * Detects sections by scanning the entire document for heading patterns
 */
function detectHeadingPatterns(content: string): {
    sections: Section[]
} {
    const sections: Section[] = [];
    const lines = content.split('\n');
    let currentLevel1: string | undefined;

    // Track scanning position
    let charIndex = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Keep track of accurate startIndex
        // content.split('\n') loses newline chars, need to account for them? 
        // Actually using content.indexOf(line, charIndex) is safer but slower.
        // For now, let's approximation or cumulative tracking.
        // Cumulative tracking:
        const lineStart = charIndex;
        charIndex += lines[i].length + 1; // +1 for newline

        if (!line) continue;
        if (line.length > 60) continue; // Headings shouldn't be too long

        // Level 1 check
        let isLevel1 = false;
        for (const pattern of HEADING_PATTERNS.level1) {
            if (pattern.test(line)) {
                currentLevel1 = line;
                sections.push({
                    title: line,
                    level: 1,
                    startIndex: lineStart,
                });
                isLevel1 = true;
                break;
            }
        }
        if (isLevel1) continue;

        // Level 2 check
        for (const pattern of HEADING_PATTERNS.level2) {
            if (pattern.test(line)) {
                sections.push({
                    title: line,
                    level: 2,
                    startIndex: lineStart,
                    parent: currentLevel1,
                });
                break;
            }
        }
    }

    return { sections };
}

/**
 * Helper to calculate endIndex for each section
 */
function calculateEndIndices(sections: Section[], totalLength: number): Section[] {
    return sections.map((section, idx) => {
        const nextSection = sections[idx + 1];
        return {
            ...section,
            endIndex: nextSection ? nextSection.startIndex : totalLength
        };
    });
}
