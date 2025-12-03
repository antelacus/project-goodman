-- Migration: Add structured storage tables for financial data and regulations
-- Date: 2025-01-13
-- Purpose: Support dual storage architecture (structured + vector)

-- ============================================================================
-- Table 1: financial_data
-- Stores structured financial metrics extracted from financial statements
-- ============================================================================

CREATE TABLE financial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL, -- 'balance_sheet', 'income_statement', 'cash_flow'
  year VARCHAR(4) NOT NULL,
  period VARCHAR(20) NOT NULL, -- 'Q1', 'Q2', 'Q3', 'Q4', 'annual'
  metric_name VARCHAR(100) NOT NULL, -- '流动资产.存货', '资产总计', '营业收入'
  metric_value NUMERIC(20, 2) NOT NULL,
  metric_value_previous NUMERIC(20, 2), -- Previous period value for comparison
  unit VARCHAR(20) NOT NULL DEFAULT '元', -- '元', '%', '次', etc.
  section VARCHAR(100), -- '流动资产', '流动负债', '营业收入', etc.
  metadata JSONB DEFAULT '{}', -- Additional context
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_financial_data_document ON financial_data(document_id);
CREATE INDEX idx_financial_data_lookup ON financial_data(data_type, year, period, metric_name);
CREATE INDEX idx_financial_data_year ON financial_data(year);
CREATE INDEX idx_financial_data_type_year ON financial_data(data_type, year);

-- Unique constraint to prevent duplicate metrics
CREATE UNIQUE INDEX idx_financial_data_unique
ON financial_data(document_id, metric_name, year, period);

COMMENT ON TABLE financial_data IS 'Structured financial metrics extracted from financial statements';
COMMENT ON COLUMN financial_data.metric_name IS 'Hierarchical metric name using dot notation (e.g., 流动资产.存货)';

-- ============================================================================
-- Table 2: structured_regulations
-- Stores structured regulatory content for fast keyword-based matching
-- ============================================================================

CREATE TABLE structured_regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  regulation_name VARCHAR(200) NOT NULL, -- '增值税法', '企业会计准则'
  article_number VARCHAR(50) NOT NULL, -- '第一条', '第十三条'
  sub_article VARCHAR(50), -- '（一）', '（二）', for nested articles
  title TEXT,
  content TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}', -- ['增值税', '税率', '13%']
  effective_date DATE,
  expiry_date DATE,
  parent_article_id UUID REFERENCES structured_regulations(id),
  hierarchy JSONB, -- ["第十三条", "（一）", "1."] for nested structure
  applicability JSONB, -- { regions: [], industries: [], entity_types: [] }
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_regulations_document ON structured_regulations(document_id);
CREATE INDEX idx_regulations_keywords ON structured_regulations USING GIN(keywords);
CREATE INDEX idx_regulations_article ON structured_regulations(regulation_name, article_number);
CREATE INDEX idx_regulations_effective ON structured_regulations(effective_date, expiry_date);
CREATE INDEX idx_regulations_parent ON structured_regulations(parent_article_id);

-- Full-text search index for Chinese content
CREATE INDEX idx_regulations_content_fts ON structured_regulations USING GIN(to_tsvector('simple', content));

COMMENT ON TABLE structured_regulations IS 'Structured regulatory content with article-level granularity';
COMMENT ON COLUMN structured_regulations.hierarchy IS 'JSON array representing nested article structure';

-- ============================================================================
-- Table 3: preset_functions
-- Stores calculation function definitions for financial metrics
-- ============================================================================

CREATE TABLE preset_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE, -- 'debt_to_asset_ratio'
  display_name VARCHAR(100) NOT NULL, -- '资产负债率'
  display_name_en VARCHAR(100), -- 'Debt-to-Asset Ratio'
  category VARCHAR(50) NOT NULL, -- 'solvency', 'liquidity', 'profitability', 'efficiency'
  formula TEXT NOT NULL, -- 'total_liabilities / total_assets'
  required_inputs JSONB NOT NULL, -- ['total_liabilities', 'total_assets']
  description TEXT,
  formula_display TEXT, -- '资产负债率 = 负债总计 / 资产总计'
  unit VARCHAR(20) NOT NULL DEFAULT '%', -- '%', '元', '次'
  validation_rules JSONB, -- { min: 0, max: 1, warn_if: { above: 0.7 } }
  interpretation_guide TEXT, -- Guidance on what the metric means
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_preset_functions_category ON preset_functions(category);
CREATE INDEX idx_preset_functions_active ON preset_functions(is_active);

COMMENT ON TABLE preset_functions IS 'Definitions of preset financial calculation functions';
COMMENT ON COLUMN preset_functions.formula IS 'Expression-based formula for calculation';

-- ============================================================================
-- Table 4: calculation_history
-- Logs all calculations performed for audit and debugging
-- ============================================================================

CREATE TABLE calculation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_id UUID NOT NULL REFERENCES preset_functions(id),
  user_query TEXT NOT NULL,
  input_data JSONB NOT NULL, -- { total_liabilities: 2000000, total_assets: 5000000 }
  result JSONB NOT NULL, -- { value: 0.4, formatted: "40.00%", confidence: 0.95 }
  source_documents TEXT[] NOT NULL, -- Array of document IDs used
  calculation_steps JSONB, -- Detailed step-by-step breakdown
  confidence_score NUMERIC(3, 2),
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calc_history_function ON calculation_history(function_id);
CREATE INDEX idx_calc_history_created ON calculation_history(created_at DESC);

COMMENT ON TABLE calculation_history IS 'Audit log of all calculations performed';

-- ============================================================================
-- Table 5: admin_config
-- Stores admin configuration including system settings
-- ============================================================================

CREATE TABLE admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin configuration
-- Note: Actual admin password is stored in environment variable ADMIN_PASSWORD
INSERT INTO admin_config (config_key, config_value, description)
VALUES ('admin_password_hint', 'Set in .env.local as ADMIN_PASSWORD', 'Admin password is stored in environment variable, not in database');

COMMENT ON TABLE admin_config IS 'System configuration including admin settings';
COMMENT ON COLUMN admin_config.config_key IS 'Unique configuration key';
