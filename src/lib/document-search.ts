import { createServerSupabaseClient } from '@/lib/supabase';
import { Database } from '@/lib/database.types';

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

export interface SearchResultDocument {
    documentId: string;
    documentName: string;
    docType: string;
    year?: number;
    period?: string;
    relevanceScore: number; // 0-100
    matchedChunks: SearchResultChunk[];
}

export interface SearchResultChunk {
    chunkId: string;
    content: string;
    sectionTitle?: string;
    sectionPath?: string[];
    similarity: number; // This is actually RRF score in hybrid mode, or similarity in vector mode
    sourceType: 'vector' | 'keyword' | 'hybrid';
}

export interface DocumentSearchResponse {
    documents: SearchResultDocument[];
    totalMatches: number;
    searchMeta: {
        queryKeywords: string[];
        searchDuration: number;
    };
}

/**
 * Performs a hybrid search (Vector + Keyword) using RRF Fusion
 */
export async function searchDocuments(
    query: string,
    filters: DocumentSearchFilters = {},
    options: DocumentSearchOptions = {}
): Promise<DocumentSearchResponse> {
    const startTime = Date.now();
    const supabase = createServerSupabaseClient();

    // 1. Generate text embedding for the query
    // Note: We use the same model as ingestion
    const embeddingResponse = await supabase.functions.invoke('embed', {
        body: { input: query }
    });

    // Fallback if edge function fails or use local/other embedding method if project setup differs
    // Assuming 'embed' function exists or we have a local helper. 
    // Checking codebase, usually there is an openai helper or supabase helper.
    // Implementation below assumes we get embedding.
    // For now stubbing embedding generation as it depends on `ai-extraction.ts` or similar.
    // Let's assume we have a helper `generateEmbedding(query)`.
    const queryEmbedding = await generateEmbedding(query);

    // 2. Call the RPC function `search_documents_hybrid`
    // mapping inputs to RPC params
    const rpcParams = {
        query_embedding: queryEmbedding,
        query_text: query,
        match_count: options.limit ?? 10,
        section_filter: filters.sections?.[0] ?? null, // RPC currently supports single string match ILIKE
        year_filter: filters.year ?? null,
        doc_type_filter: filters.docTypes?.[0] ?? null, // RPC currently supports single type equality
        // weights are defaulted in RPC
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcResults, error } = await (supabase.rpc as any)(
        'search_documents_hybrid',
        rpcParams
    );

    if (error) {
        console.error('Hybrid search error:', error);
        throw new Error(`Search failed: ${error.message}`);
    }

    // 3. Process and group results by Document
    // The RPC returns flat chunks. We need to group them by document_id.

    const documentsMap = new Map<string, SearchResultDocument>();

    (rpcResults || []).forEach((row: any) => {
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

async function generateEmbedding(text: string): Promise<number[]> {
    // Simple OpenAI embedding wrapper
    // This should ideally reuse a shared instance from `src/lib/ai-extraction.ts` or similar
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
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
