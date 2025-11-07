-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table: stores document metadata
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  doc_category TEXT NOT NULL CHECK (doc_category IN ('knowledge', 'business')),
  doc_type TEXT,
  upload_time TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'ready' CHECK (status IN ('processing', 'ready', 'error')),
  size INTEGER NOT NULL,
  summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks table: stores text chunks with embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, chunk_index)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_doc_category ON documents(doc_category);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_chunk ON document_chunks(document_id, chunk_index);

-- Create IVFFlat index for vector similarity search (cosine distance)
-- Note: This index is created after data insertion for better performance
-- Uncomment after migrating data:
-- CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks
-- USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Vector similarity search function
-- Returns the most similar document chunks based on cosine similarity
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count INT DEFAULT 3,
  filter_doc_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  document_id TEXT,
  content TEXT,
  chunk_index INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    document_chunks.chunk_index,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE
    document_chunks.embedding IS NOT NULL
    AND (filter_doc_ids IS NULL OR document_chunks.document_id = ANY(filter_doc_ids))
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get documents with their chunks
CREATE OR REPLACE FUNCTION get_document_with_chunks(doc_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'document', row_to_json(d.*),
    'chunks', COALESCE(
      (SELECT json_agg(row_to_json(c.*) ORDER BY c.chunk_index)
       FROM document_chunks c
       WHERE c.document_id = d.id),
      '[]'::json
    )
  ) INTO result
  FROM documents d
  WHERE d.id = doc_id;

  RETURN result;
END;
$$;

-- Function to get all documents by category
CREATE OR REPLACE FUNCTION get_documents_by_category(category TEXT)
RETURNS SETOF documents
LANGUAGE sql
AS $$
  SELECT * FROM documents WHERE doc_category = category ORDER BY created_at DESC;
$$;

-- Add comments for documentation
COMMENT ON TABLE documents IS 'Stores document metadata (both knowledge and business documents)';
COMMENT ON TABLE document_chunks IS 'Stores document text chunks with their vector embeddings';
COMMENT ON FUNCTION match_documents IS 'Performs vector similarity search using cosine distance';
COMMENT ON COLUMN document_chunks.embedding IS 'OpenAI text-embedding-3-small (1536 dimensions)';
