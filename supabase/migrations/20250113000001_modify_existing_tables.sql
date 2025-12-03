-- Migration: Modify existing tables for enhanced functionality
-- Date: 2025-01-13
-- Purpose: Add columns to support structured extraction and enhanced chunk metadata

-- ============================================================================
-- Modify: documents table
-- Add columns for better categorization and extraction tracking
-- ============================================================================

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS extraction_status VARCHAR(20) DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS extraction_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_structured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS year VARCHAR(4),
ADD COLUMN IF NOT EXISTS period VARCHAR(20);

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_documents_extraction_status ON documents(extraction_status);
CREATE INDEX IF NOT EXISTS idx_documents_year_period ON documents(year, period);
CREATE INDEX IF NOT EXISTS idx_documents_structured ON documents(is_structured);

-- Add comments
COMMENT ON COLUMN documents.processed_at IS 'Timestamp when document processing completed';
COMMENT ON COLUMN documents.extraction_status IS 'Status of structured data extraction process';
COMMENT ON COLUMN documents.extraction_metadata IS 'Metadata from extraction process including confidence scores';
COMMENT ON COLUMN documents.is_structured IS 'Whether document has been processed for structured data extraction';
COMMENT ON COLUMN documents.year IS 'Year for financial statements (e.g., 2024)';
COMMENT ON COLUMN documents.period IS 'Period for financial statements (Q1, Q2, Q3, Q4, annual)';

-- ============================================================================
-- Modify: document_chunks table
-- Add metadata for enhanced chunk management
-- ============================================================================

ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS chunk_type VARCHAR(50), -- 'article', 'section', 'paragraph', 'general'
ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES document_chunks(id),
ADD COLUMN IF NOT EXISTS hierarchy JSONB,
ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_chunks_type ON document_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_chunks_keywords ON document_chunks USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_chunks_parent ON document_chunks(parent_id);

-- Add comments
COMMENT ON COLUMN document_chunks.chunk_type IS 'Type of chunk for document-specific processing (article, section, paragraph, general)';
COMMENT ON COLUMN document_chunks.parent_id IS 'Reference to parent chunk for nested structures';
COMMENT ON COLUMN document_chunks.hierarchy IS 'JSON representation of chunk hierarchy (e.g., ["Chapter 1", "Section 1.1"])';
COMMENT ON COLUMN document_chunks.keywords IS 'Extracted keywords for improved search and filtering';
