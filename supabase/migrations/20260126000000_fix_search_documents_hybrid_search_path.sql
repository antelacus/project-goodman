-- Migration: Fix search_documents_hybrid search_path
-- Date: 2026-01-26
-- Issue: Q55-57 document search fails with "operator does not exist: extensions.vector <=> extensions.vector"
-- Root cause: Function search_path doesn't include 'extensions' schema where pgvector operators are defined

-- Drop and recreate the function with correct search_path
DROP FUNCTION IF EXISTS search_documents_hybrid;

CREATE OR REPLACE FUNCTION search_documents_hybrid(
  query_embedding vector(1536),
  query_text text,
  match_count int DEFAULT 10,
  section_filter text DEFAULT NULL,
  year_filter int DEFAULT NULL,
  doc_type_filter text DEFAULT NULL,
  vector_weight float DEFAULT 0.5,
  keyword_weight float DEFAULT 0.5
)
RETURNS TABLE (
  chunk_id text,
  document_id text,
  document_name text,
  doc_type text,
  content text,
  section_title text,
  section_path text[],
  vector_rank int,
  keyword_rank int,
  rrf_score float,
  year int,
  period text
)
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  rrf_k CONSTANT int := 60;
  recall_count CONSTANT int := 20;
BEGIN
  RETURN QUERY
  WITH
  vector_recall AS (
    SELECT
      dc.id AS chunk_id,
      dc.document_id,
      d.name AS document_name,
      d.doc_type,
      dc.content,
      dc.section_title,
      dc.section_path,
      d.year,
      d.period,
      ROW_NUMBER() OVER (ORDER BY dc.embedding <=> query_embedding) AS v_rank
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.doc_category = 'knowledge'
      AND d.status = 'ready'
      AND (year_filter IS NULL OR (d.year ~ '^\d+$' AND d.year::int = year_filter))
      AND (doc_type_filter IS NULL OR d.doc_type = doc_type_filter)
      AND (section_filter IS NULL OR dc.section_title ILIKE '%' || section_filter || '%')
    ORDER BY dc.embedding <=> query_embedding
    LIMIT recall_count
  ),
  keyword_recall AS (
    SELECT
      dc.id AS chunk_id,
      dc.document_id,
      d.name AS document_name,
      d.doc_type,
      dc.content,
      dc.section_title,
      dc.section_path,
      d.year,
      d.period,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(
          to_tsvector('simple', dc.content),
          plainto_tsquery('simple', query_text)
        ) DESC
      ) AS k_rank
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.doc_category = 'knowledge'
      AND d.status = 'ready'
      AND (year_filter IS NULL OR (d.year ~ '^\d+$' AND d.year::int = year_filter))
      AND (doc_type_filter IS NULL OR d.doc_type = doc_type_filter)
      AND (section_filter IS NULL OR dc.section_title ILIKE '%' || section_filter || '%')
      AND to_tsvector('simple', dc.content) @@ plainto_tsquery('simple', query_text)
    ORDER BY ts_rank_cd(
      to_tsvector('simple', dc.content),
      plainto_tsquery('simple', query_text)
    ) DESC
    LIMIT recall_count
  ),
  combined AS (
    SELECT
      COALESCE(v.chunk_id, k.chunk_id) AS chunk_id,
      COALESCE(v.document_id, k.document_id) AS document_id,
      COALESCE(v.document_name, k.document_name) AS document_name,
      COALESCE(v.doc_type, k.doc_type) AS doc_type,
      COALESCE(v.content, k.content) AS content,
      COALESCE(v.section_title, k.section_title) AS section_title,
      COALESCE(v.section_path, k.section_path) AS section_path,
      COALESCE(v.year, k.year) AS year,
      COALESCE(v.period, k.period) AS period,
      COALESCE(v.v_rank, recall_count + 1) AS vector_rank,
      COALESCE(k.k_rank, recall_count + 1) AS keyword_rank,
      ((1.0 / (rrf_k + COALESCE(v.v_rank, recall_count + 1))) +
      (1.0 / (rrf_k + COALESCE(k.k_rank, recall_count + 1))))::float AS rrf_score
    FROM vector_recall v
    FULL OUTER JOIN keyword_recall k ON v.chunk_id = k.chunk_id
  )
  SELECT
    c.chunk_id,
    c.document_id,
    c.document_name,
    c.doc_type,
    c.content,
    c.section_title,
    c.section_path,
    c.vector_rank::int,
    c.keyword_rank::int,
    c.rrf_score,
    CASE WHEN c.year ~ '^\d+$' THEN c.year::int ELSE NULL END,
    c.period::text
  FROM combined c
  ORDER BY c.rrf_score DESC
  LIMIT match_count;
END;
$$;
