-- Migration: Add database functions for financial and regulatory search
-- Date: 2025-01-13
-- Purpose: Support structured data queries and hybrid search

-- ============================================================================
-- Function 1: search_financial_data
-- Retrieves financial metrics with optional filtering
-- ============================================================================

CREATE OR REPLACE FUNCTION search_financial_data(
  p_metric_names TEXT[] DEFAULT NULL,
  p_year VARCHAR DEFAULT NULL,
  p_period VARCHAR DEFAULT NULL,
  p_data_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  metric_name VARCHAR,
  metric_value NUMERIC,
  unit VARCHAR,
  year VARCHAR,
  period VARCHAR,
  document_id TEXT,
  document_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fd.metric_name,
    fd.metric_value,
    fd.unit,
    fd.year,
    fd.period,
    fd.document_id,
    d.name as document_name
  FROM financial_data fd
  JOIN documents d ON fd.document_id = d.id
  WHERE
    (p_metric_names IS NULL OR fd.metric_name = ANY(p_metric_names))
    AND (p_year IS NULL OR fd.year = p_year)
    AND (p_period IS NULL OR fd.period = p_period)
    AND (p_data_type IS NULL OR fd.data_type = p_data_type)
  ORDER BY fd.year DESC, fd.period DESC;
END;
$$;

COMMENT ON FUNCTION search_financial_data IS 'Search financial data with flexible filtering by metric names, year, period, and data type';

-- ============================================================================
-- Function 2: search_regulations_hybrid
-- Hybrid search combining keyword matching and vector similarity
-- ============================================================================

CREATE OR REPLACE FUNCTION search_regulations_hybrid(
  p_keywords TEXT[],
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  regulation_id UUID,
  regulation_name VARCHAR,
  article_number VARCHAR,
  content TEXT,
  keywords TEXT[],
  keyword_match_score NUMERIC,
  semantic_similarity NUMERIC,
  combined_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH keyword_matches AS (
    SELECT
      sr.id,
      sr.regulation_name,
      sr.article_number,
      sr.content,
      sr.keywords,
      -- Calculate keyword match score (percentage of query keywords found)
      CASE
        WHEN p_keywords IS NULL OR array_length(p_keywords, 1) IS NULL THEN 0
        ELSE (
          SELECT COUNT(*)::NUMERIC / NULLIF(array_length(p_keywords, 1), 0)
          FROM unnest(p_keywords) qk
          WHERE qk = ANY(sr.keywords)
        )
      END as kw_score
    FROM structured_regulations sr
    WHERE p_keywords IS NULL OR p_keywords && sr.keywords -- At least one keyword matches
  ),
  semantic_matches AS (
    SELECT
      sr.id,
      1 - (dc.embedding <=> p_query_embedding) as similarity
    FROM structured_regulations sr
    JOIN document_chunks dc ON dc.document_id = sr.document_id
    WHERE dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> p_query_embedding
    LIMIT 20
  )
  SELECT
    km.id as regulation_id,
    km.regulation_name,
    km.article_number,
    km.content,
    km.keywords,
    COALESCE(km.kw_score, 0) as keyword_match_score,
    COALESCE(sm.similarity, 0) as semantic_similarity,
    -- Combined score: 50% keyword match, 50% semantic similarity
    (COALESCE(km.kw_score, 0) * 0.5 + COALESCE(sm.similarity, 0) * 0.5) as combined_score
  FROM keyword_matches km
  LEFT JOIN semantic_matches sm ON km.id = sm.id
  ORDER BY combined_score DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_regulations_hybrid IS 'Hybrid search combining keyword matching (50%) and vector similarity (50%) for regulatory content';

-- ============================================================================
-- Helper Function: get_financial_metrics_by_year
-- Quick lookup for all metrics in a specific year
-- ============================================================================

CREATE OR REPLACE FUNCTION get_financial_metrics_by_year(
  p_year VARCHAR,
  p_period VARCHAR DEFAULT 'annual'
)
RETURNS TABLE (
  metric_name VARCHAR,
  metric_value NUMERIC,
  unit VARCHAR,
  section VARCHAR,
  document_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fd.metric_name,
    fd.metric_value,
    fd.unit,
    fd.section,
    d.name as document_name
  FROM financial_data fd
  JOIN documents d ON fd.document_id = d.id
  WHERE fd.year = p_year
    AND fd.period = p_period
  ORDER BY fd.section, fd.metric_name;
END;
$$;

COMMENT ON FUNCTION get_financial_metrics_by_year IS 'Get all financial metrics for a specific year and period';
