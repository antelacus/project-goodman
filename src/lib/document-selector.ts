
import { analyzeIntent } from './query-intent';
import { searchDocuments, SearchResultDocument } from './document-search';

export interface DocumentSelectionResult {
    selectedDocuments: SearchResultDocument[];
    intent: {
        query: string;
        keywords: string[];
        year?: number;
    };
    meta: {
        totalFound: number;
        autoSelectedCount: number;
    };
}

export interface SelectionOptions {
    maxDocuments?: number;
    threshold?: number;
    // Force specific filters (overriding intent)
    forceYear?: number;
}

/**
 * Orchestrates the intelligent document selection process:
 * 1. Analyzes Query Intent
 * 2. Performs Hybrid Search
 * 3. Selects Top Relevant Documents
 */
export async function selectDocumentsForQuery(
    query: string,
    options: SelectionOptions = {}
): Promise<DocumentSelectionResult> {
    const maxDocs = options.maxDocuments ?? 5;

    // 1. Analyze Intent
    const intent = await analyzeIntent(query);

    // Allow options to override intent (e.g. context from previous turn)
    const yearFilter = options.forceYear ?? intent.filters.year;

    // 2. Search
    const searchResults = await searchDocuments(
        query,
        {
            year: yearFilter,
            docTypes: intent.filters.docTypes,
        },
        {
            limit: 20, // Fetch more candidates than we need selection
            threshold: options.threshold ?? 40, // Minimum relevance 40/100
        }
    );

    // 3. Select Best Documents
    // Simple Strategy: Top N by relevance score
    // Improvement: If 'year' was explicit, prioritize docs matching that year?
    // The search already filtered by year if it was explicit. 
    // If year was NOT filtered, we might want to ensure we don't just pick random years if the query didn't specify.
    // For now, trust the RRF score.

    const selected = searchResults.documents.slice(0, maxDocs);

    return {
        selectedDocuments: selected,
        intent: {
            query: intent.originalQuery,
            keywords: intent.keywords,
            year: yearFilter
        },
        meta: {
            totalFound: searchResults.documents.length,
            autoSelectedCount: selected.length
        }
    };
}
