import { createServerSupabaseClient, searchDocumentsHybrid } from '@/lib/database';
import type { SearchDocumentsHybridResult } from '@/lib/database';
import { traceable } from 'langsmith/traceable';

import { SearchResultDocument } from '@/lib/types/domain-types';

// Types define the search filters and options
export interface DocumentSearchFilters {
    year?: number;
    docTypes?: string[];
    sections?: string[];
}

export interface DocumentSearchOptions {
    limit?: number;
    includeContent?: boolean;
    threshold?: number; // Minimum relevance score (0-100)
}

// SearchResultDocument and SearchResultChunk are now imported from domain-types

export interface DocumentSearchResponse {
    documents: SearchResultDocument[];
    totalMatches: number;
    searchMeta: {
        queryKeywords: string[];
        searchDuration: number;
    };
}

/**
 * Internal search implementation
 */
async function searchDocumentsInternal(
    query: string,
    filters: DocumentSearchFilters = {},
    options: DocumentSearchOptions = {}
): Promise<DocumentSearchResponse> {
    const startTime = Date.now();
    const supabase = createServerSupabaseClient();

    // 1. Generate text embedding for the query
    let queryEmbedding: number[] | null = null;

    try {
        const { data: embedData, error: embedError } = await supabase.functions.invoke('embed', {
            body: { input: query }
        });

        if (!embedError && embedData?.embedding) {
            queryEmbedding = embedData.embedding;
        }
    } catch (e) {
        console.warn('Edge function embedding failed, falling back to local:', e);
    }

    // Fallback if edge function failed
    if (!queryEmbedding) {
        queryEmbedding = await generateEmbedding(query);
    }

    // 2. Call the RPC function `search_documents_hybrid`
    // Use type-safe helper from database helpers
    let rpcResults: SearchDocumentsHybridResult[];
    try {
        rpcResults = await searchDocumentsHybrid(supabase, {
            query_embedding: JSON.stringify(queryEmbedding),
            query_text: query,
            match_count: options.limit ?? 10,
            section_filter: filters.sections?.[0],
            year_filter: filters.year,
            doc_type_filter: filters.docTypes?.[0],
        });
    } catch (error) {
        console.error('Hybrid search error:', error);
        throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 3. Process and group results by Document
    // The RPC returns flat chunks. We need to group them by document_id.

    const documentsMap = new Map<string, SearchResultDocument>();

    rpcResults.forEach((row) => {
        // Normalize RRF score to 0-100 relevance
        // Max theoretical RRF (rank 1 in both lists) approx 0.033 -> 100
        // Min useful RRF (rank 20 in one list) approx 0.012 -> 40
        const normalizedScore = normalizeRrfScore(row.rrf_score);

        if (options.threshold && normalizedScore < options.threshold) {
            return;
        }

        if (!documentsMap.has(row.document_id)) {
            documentsMap.set(row.document_id, {
                documentId: row.document_id,
                documentName: row.document_name,
                docType: row.doc_type,
                year: row.year,
                period: row.period,
                relevanceScore: normalizedScore, // Use best chunk's score as doc score
                matchedChunks: []
            });
        }

        const doc = documentsMap.get(row.document_id)!;

        // Additional chunks might add to the evidence, but usually we take the max score
        // or we could sum them? For now, we take max (which is the first one since sorted)
        // Actually, distinct chunks from same doc might appear?
        // RPC `search_documents_hybrid` returns chunks.

        doc.matchedChunks.push({
            chunkId: row.chunk_id,
            content: row.content,
            sectionTitle: row.section_title,
            sectionPath: row.section_path,
            similarity: row.rrf_score, // Internal score
            sourceType: 'hybrid'
        });
    });

    const documents = Array.from(documentsMap.values());

    return {
        documents,
        totalMatches: documents.length,
        searchMeta: {
            queryKeywords: [], // TODO: Extract keywords if needed
            searchDuration: Date.now() - startTime
        }
    };
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

import OpenAI from 'openai';
import { AI_CONFIG } from '@/lib/ai/config';

async function generateEmbedding(text: string): Promise<number[]> {
    // Simple OpenAI embedding wrapper
    // This should ideally reuse a shared instance from `src/lib/ai-extraction.ts` or similar
    const openai = new OpenAI();
    const response = await openai.embeddings.create({
        model: AI_CONFIG.models.embedding,
        input: text.replace(/\n/g, ' '),
    });
    return response.data[0].embedding;
}

function normalizeRrfScore(rrfScore: number): number {
    // RRF = 1/(60+rank1) + 1/(60+rank2)
    // Max ~ 1/61 + 1/61 = 0.0328
    // Min (single rank 20) ~ 1/80 = 0.0125

    // Linear mapping: 0.01 -> 30, 0.033 -> 100
    const minVal = 0.01;
    const maxVal = 0.033;

    if (rrfScore <= minVal) return 30;
    if (rrfScore >= maxVal) return 100;

    const ratio = (rrfScore - minVal) / (maxVal - minVal);
    return Math.round(30 + ratio * 70);
}

// ----------------------------------------------------------------------------
// Traced Export (LangSmith custom span)
// ----------------------------------------------------------------------------

/**
 * Performs a hybrid search (Vector + Keyword) using RRF Fusion
 * Wrapped with LangSmith tracing for observability
 */
export const searchDocuments = traceable(
    searchDocumentsInternal,
    {
        name: "search_documents_hybrid",
        run_type: "retriever",
        metadata: {
            component: "document_search",
            searchType: "hybrid_rrf",
        },
    }
);
