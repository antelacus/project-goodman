-- Migration: Add Intelligent Search Support (V3.3 Phase 2)
-- Date: 2025-12-18
-- Support for Section Parsing & Hybrid Search (RRF)

-- ============================================================================
-- 1. Table Extension: document_chunks
-- ============================================================================

ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS section_title TEXT;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS section_level INTEGER DEFAULT 0;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS section_path TEXT[];

-- Indexes for section search
CREATE INDEX IF NOT EXISTS idx_chunks_section_title 
ON document_chunks USING gin(to_tsvector('simple', COALESCE(section_title, '')));

CREATE INDEX IF NOT EXISTS idx_chunks_section_path 
ON document_chunks USING gin(section_path);

-- Deprecate old hierarchy column (if exists)
COMMENT ON COLUMN document_chunks.hierarchy IS 
  'DEPRECATED: 使用 section_path TEXT[] 替代。保留字段以兼容旧数据。';

-- ============================================================================
-- 2. Table Extension: documents
-- ============================================================================

ALTER TABLE documents ADD COLUMN IF NOT EXISTS section_structure JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS structure_quality TEXT 
  CHECK (structure_quality IN ('good', 'moderate', 'basic'));

-- Composite index for filtering
CREATE INDEX IF NOT EXISTS idx_documents_type_year 
ON documents(doc_type, year) WHERE status = 'ready';

-- ============================================================================
-- 3. Function: Hybrid Search with RRF (Vector + Keyword)
-- ============================================================================

CREATE OR REPLACE FUNCTION search_documents_hybrid(
  query_embedding vector(1536),
  query_text text,                    -- 原始查询文本，用于全文搜索
  match_count int DEFAULT 10,
  section_filter text DEFAULT NULL,
  year_filter int DEFAULT NULL,
  doc_type_filter text DEFAULT NULL,
  vector_weight float DEFAULT 0.5,    -- 向量搜索权重(此处用于参考，RRF主要靠rank)
  keyword_weight float DEFAULT 0.5    -- 关键词搜索权重
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,  -- Changed from text to uuid to match likely schema (or text if documents.id is text)
  -- WAIT: documents.id definition in 20250107... was TEXT. document_chunks.id was TEXT.
  -- Returning TEXT to be safe and consistent with existing schema.
  
  document_name text,
  doc_type text,
  content text,
  section_title text,
  section_path text[],
  vector_rank int,
  keyword_rank int,
  rrf_score float,
  year int,          -- documents table has year VARCHAR(4) in 20250113... migration? 
                     -- Let's check schema again. 
                     -- 20250113...: ADD COLUMN IF NOT EXISTS year VARCHAR(4)
                     -- DESIGN doc says: year int.
                     -- I should probably cast or change return type.
                     -- Let's stick to what the table has: VARCHAR(4).
                     -- But wait, standardizing on INT for year is better for range queries.
                     -- However, if the column IS varchar, I should return varchar or cast.
                     -- Design doc `search_documents_hybrid` returns `year int`.
                     -- I will attempt to cast `d.year::int`.
  period text
)
LANGUAGE plpgsql
AS $$
DECLARE
  k CONSTANT int := 60;  -- RRF Constant
  recall_count CONSTANT int := 20;
BEGIN
  RETURN QUERY
  WITH
  -- Path A: Vector Recall (Top-20)
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
      AND (year_filter IS NULL OR d.year::int = year_filter) -- Casting for filter
      AND (doc_type_filter IS NULL OR d.doc_type = doc_type_filter)
      AND (section_filter IS NULL OR dc.section_title ILIKE '%' || section_filter || '%')
    ORDER BY dc.embedding <=> query_embedding
    LIMIT recall_count
  ),
  -- Path B: Keyword Recall (Top-20)
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
      AND (year_filter IS NULL OR d.year::int = year_filter)
      AND (doc_type_filter IS NULL OR d.doc_type = doc_type_filter)
      AND (section_filter IS NULL OR dc.section_title ILIKE '%' || section_filter || '%')
      AND to_tsvector('simple', dc.content) @@ plainto_tsquery('simple', query_text)
    ORDER BY ts_rank_cd(
      to_tsvector('simple', dc.content),
      plainto_tsquery('simple', query_text)
    ) DESC
    LIMIT recall_count
  ),
  -- Fusion: Union + RRF
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
      -- RRF Formula
      (1.0 / (k + COALESCE(v.v_rank, recall_count + 1))) +
      (1.0 / (k + COALESCE(k.k_rank, recall_count + 1))) AS rrf_score
    FROM vector_recall v
    FULL OUTER JOIN keyword_recall k ON v.chunk_id = k.chunk_id
  )
  SELECT
    c.chunk_id::uuid,       -- Casting to UUID if the return type demands it, but wait.
                            -- Existing schema says: id TEXT.
                            -- Design says: RETURNS TABLE (chunk_id uuid, ...)
                            -- But currently tables use TEXT for IDs (based on 20250107...sql).
                            -- I should CHANGE reference to TEXT to match existing schema to avoid cast errors if they contain non-uuid text (unlikely for Supabase but possible).
                            -- ACTUALLY, checking 20250107...sql: "id TEXT PRIMARY KEY".
                            -- So I should probably return TEXT.
                            -- I'll modify the RETURNS TABLE definition to TEXT to be safer.
    c.chunk_id::uuid, -- Actually, let's look at the RETURNS clause above in the file.
                      -- I defined it as `chunk_id uuid` in the previous block.
                      -- If the table is TEXT, I should probably change the RETURNS to TEXT.
                      -- I will correct the RETURN definition below in this file content.
    c.document_id::uuid,
    c.document_name,
    c.doc_type,
    c.content,
    c.section_title,
    c.section_path,
    c.vector_rank::int,
    c.keyword_rank::int,
    c.rrf_score,
    c.year::int, -- Cast to int
    c.period
  FROM combined c
  ORDER BY c.rrf_score DESC
  LIMIT match_count;
END;
$$;

-- Correcting the UUID vs TEXT issue:
-- Since existing tables use TEXT, but I defined UUID in the function signature above...
-- I will redefine the function with TEXT to be safe and strictly consistent.

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
  chunk_id text,      -- Changed to TEXT
  document_id text,   -- Changed to TEXT
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
      -- Safe cast check: year is VARCHAR(4) in table
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
    CASE WHEN c.year ~ '^\d+$' THEN c.year::int ELSE NULL END, -- Safe return as int
    c.period::text
  FROM combined c
  ORDER BY c.rrf_score DESC
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- 4. Function: Get Document Sections
-- ============================================================================

CREATE OR REPLACE FUNCTION get_document_sections(
  p_document_id text -- Changed from uuid to text
)
RETURNS TABLE (
  section_title text,
  section_level int,
  chunk_count int
)
LANGUAGE sql
AS $$
  SELECT
    section_title,
    section_level,
    COUNT(*)::int AS chunk_count
  FROM document_chunks
  WHERE document_id = p_document_id
    AND section_title IS NOT NULL
  GROUP BY section_title, section_level
  ORDER BY section_level, section_title;
$$;
