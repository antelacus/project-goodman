/**
 * Keyword search over the knowledge library (DESIGN §4).
 *
 * Callers pass the agent's keywords as given; the database functions normalize
 * and escape them, rank by keywords matched then TF-IDF, and hold the library
 * scope (ready knowledge documents only). An empty result is an empty array; a
 * database error throws, since "search failed" must not read as "nothing found".
 */

import { createServerSupabaseClient } from '@/lib/database';

export interface RegulationHit {
  regulationName: string;
  articleNumber: string;
  content: string;
  documentId: string;
  fileUrl: string | null;
  score: number;
}

export interface KnowledgeHit {
  documentId: string;
  documentName: string;
  docType: string | null;
  year: string | null;
  fileUrl: string | null;
  sectionTitle: string | null;
  content: string;
  score: number;
}

export async function searchRegulations(keywords: string[], limit = 5): Promise<RegulationHit[]> {
  const { data, error } = await createServerSupabaseClient().rpc('search_regulation_articles', {
    p_keywords: keywords,
    p_limit: limit,
  });
  if (error) throw new Error(`regulation search failed: ${error.message}`);
  return (data ?? []).map(row => ({
    regulationName: row.regulation_name,
    articleNumber: row.article_number,
    content: row.content,
    documentId: row.document_id,
    fileUrl: row.file_url,
    score: row.score,
  }));
}

export async function searchKnowledge(
  keywords: string[],
  filters: { year?: string; docTypes?: string[] } = {},
  limit = 5
): Promise<KnowledgeHit[]> {
  const { data, error } = await createServerSupabaseClient().rpc('search_knowledge_chunks', {
    p_keywords: keywords,
    p_limit: limit,
    p_year: filters.year,
    p_doc_types: filters.docTypes,
  });
  if (error) throw new Error(`knowledge search failed: ${error.message}`);
  return (data ?? []).map(row => ({
    documentId: row.document_id,
    documentName: row.document_name,
    docType: row.doc_type,
    year: row.year,
    fileUrl: row.file_url,
    sectionTitle: row.section_title,
    content: row.content,
    score: row.score,
  }));
}
