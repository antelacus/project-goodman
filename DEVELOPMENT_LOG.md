# Development Log - Project Goodman Reliability Upgrade

This document tracks our development progress through each phase of the Project Goodman reliability upgrade.

---

## 📋 Project Overview

**Goal**: Transform Project Goodman from a direct LLM-powered system into a reliable, hybrid AI architecture where LLMs orchestrate but do not perform calculations.

**Core Problem Identified**:
- LLMs directly performing financial calculations leads to hallucinations and errors
- "100% answer rate" philosophy gives wrong answers with confidence
- In finance/tax domains, "I don't know" is far better than incorrect answers

**Solution Approach**:
- LLM as orchestrator/reasoner, not calculator
- Preset calculation functions for deterministic operations
- Dual storage architecture (structured + vector)
- Confidence gating to suppress low-confidence responses

---

## Phase 1: Requirements & Planning ✅ COMPLETED

**Status**: ✅ Completed on 2025-11-12

### Objectives
- Clarify the core reliability problem
- Define success criteria for the upgraded system
- Specify requirements for all modules
- Make key architectural decisions
- Assess risks and dependencies

### Key Decisions Made

#### 1. Architectural Approach
**Decision**: Hybrid architecture where:
- **LLM role**: Intent understanding, reasoning, explanation, routing
- **Deterministic role**: Calculations, data extraction, validation
- **Storage**: Dual format (structured tables + vector embeddings)

**Rationale**: Industry best practice for financial AI systems. Separates reasoning (LLM strength) from calculation (deterministic strength).

#### 2. Document Chunking Strategy (Option C: Hybrid)
**Decision**: Document-type-specific chunking:
- **Tax regulations**: By article (sub-divide if article > 1000 words)
- **Financial statements**: By section (Assets, Liabilities, Equity, Revenue, Expenses)
- **Contracts**: By clause
- **General documents**: 800-word chunks with 100-word overlap

**Rationale**: Preserves semantic and legal context while maintaining optimal chunk sizes for embeddings.

#### 3. Preset Calculation Functions
**Decision**: Start with 10-15 most common financial ratios:
- **Liquidity ratios**: Current ratio, quick ratio, cash ratio
- **Solvency ratios**: Debt-to-asset, debt-to-equity, interest coverage
- **Profitability ratios**: Profit margin, ROE, ROA, EBITDA margin
- **Efficiency ratios**: Asset turnover, inventory turnover, receivables turnover

**Rationale**: Cover 80% of common use cases while keeping initial scope manageable. Can expand library iteratively.

#### 4. Authentication Model
**Decision**: Simple password-based authentication (stored in env variable):
- Hidden "easter egg" access (click trigger to reveal password field)
- No database user tables or complex role management
- Two modes: General user (demo) vs Admin (database uploads)

**Rationale**: Showcase project doesn't require production-grade auth. Simplifies implementation while demonstrating feature differentiation.

#### 5. Structured Data Extraction
**Decision**: Extract ALL line items from financial statements, not just commonly-used metrics.

**Rationale**: Provides maximum flexibility for future calculations and reduces need for re-processing documents.

---

### Module Requirements

#### Module 1: Landing Page (NEW)
**Purpose**: LLM-driven interface to guide users to appropriate modules

**Requirements**:
- **Chat-first design**: Conversation dominates, module cards are secondary
- LLM understands user intent and recommends appropriate module
- Introduces product capabilities naturally through dialogue
- Direct module access still available via cards/links
- Smooth routing to selected module with context preservation

**Success Criteria**:
- ✅ Users can describe their needs in natural language
- ✅ LLM accurately routes to correct module >90% of the time
- ✅ Professional, intuitive UX suitable for portfolio showcase

---

#### Module 2: Data Extraction (ENHANCED)
**Purpose**: Multi-mode document processing with role-based features

**Requirements**:

**For General Users (No Password)**:
- Upload document → Extract structured information immediately
- Display extraction results in user-friendly format
- Results are **NOT** saved to database (demo-only mode)
- Clear indication this is a temporary extraction

**For Admin Users (With Password)**:
- Password field hidden by default (easter egg: click on specific UI element)
- When correct password entered → "Upload to Database" option appears
- Uploaded database documents are processed as follows:
  1. **Document classification**: Identify type (balance sheet, income statement, tax regulation, contract, etc.)
  2. **Structured extraction**: Extract ALL data points into JSON format (type-specific schemas)
  3. **Dual storage**: Save both structured data (relational tables) AND vector embeddings (semantic search)
  4. **Metadata tagging**: Year, period, document type, keywords, hierarchy

**Technical Specifications**:
- **Structured extraction schema for balance sheets**:
  ```json
  {
    "year": "2024",
    "period": "annual",
    "metrics": {
      "流动资产.货币资金": 1000000,
      "流动资产.应收账款": 500000,
      "流动资产.存货": 800000,
      "资产总计": 5000000,
      "负债总计": 2000000,
      "所有者权益": 3000000
    }
  }
  ```
- **Structured extraction schema for tax regulations**:
  ```json
  {
    "document_name": "增值税法",
    "articles": [
      {
        "article_number": "第一条",
        "title": "...",
        "content": "...",
        "keywords": ["增值税", "税率"],
        "effective_date": "2024-01-01"
      }
    ]
  }
  ```

**Success Criteria**:
- ✅ Extraction accuracy >95% for key financial metrics
- ✅ Clear separation between demo mode and admin mode
- ✅ Structured data enables deterministic calculations
- ✅ Vector embeddings enable semantic search

---

#### Module 3: Financial Analysis (REDESIGNED)
**Purpose**: Calculate financial metrics using database documents with guaranteed accuracy

**Core Changes**:
- **No manual document selection**: LLM automatically determines relevant documents
- **LLM orchestrates, does not calculate**: Routes to preset functions
- **Deterministic calculations**: All arithmetic performed by tested functions
- **Explicit "no data" responses**: When data unavailable or no applicable function

**Workflow**:
1. User asks question: "2024年的资产负债率是多少？"
2. LLM analyzes intent:
   - Required calculation: `debt_to_asset_ratio`
   - Required data: `total_liabilities`, `total_assets`
   - Time period: `2024`
3. System queries structured database for required metrics
4. If any required data missing → Return "insufficient data" message with specifics
5. If all data present → Execute preset function (deterministic)
6. LLM explains result with full transparency:
   - Calculation formula
   - Input values (with document sources)
   - Step-by-step calculation
   - Final result

**Technical Architecture**:
```typescript
// LLM determines intent using function calling
const tools = [
  {
    name: "calculate_debt_to_asset_ratio",
    parameters: { year: string }
  },
  {
    name: "calculate_current_ratio",
    parameters: { year: string, period?: string }
  }
  // ... other preset functions
];

// Preset function (deterministic)
function calculate_debt_to_asset_ratio(total_liabilities: number, total_assets: number) {
  if (total_assets === 0) return { error: "Division by zero" };
  return {
    value: total_liabilities / total_assets,
    formatted: `${((total_liabilities / total_assets) * 100).toFixed(2)}%`,
    formula: "资产负债率 = 负债总计 / 资产总计"
  };
}
```

**Success Criteria**:
- ✅ Zero calculation errors (100% accuracy for arithmetic)
- ✅ Clear "insufficient data" messages when data missing
- ✅ All responses cite source documents
- ✅ Calculation steps are transparent and verifiable

---

#### Module 4: Compliance Guidance (REDESIGNED)
**Purpose**: Provide tax/regulatory guidance based on knowledge base with source citations

**Core Changes**:
- **Hybrid matching**: Vector search + structured keyword lookup
- **Mandatory citations**: All guidance must reference specific regulations
- **Explicit "not found" responses**: When no relevant regulation exists
- **Forward-looking guidance**: Help users understand how regulations apply to their situation

**Workflow**:
1. User uploads document or asks question
2. Document immediately vectorized (fast semantic matching)
3. Hybrid search executes:
   - **Vector search**: Find semantically similar regulation chunks
   - **Keyword extraction + structured search**: Match specific articles by keywords
4. LLM synthesizes guidance:
   - Cite specific articles: [《增值税法》第13条]
   - Explain applicability to user's situation
   - Provide step-by-step guidance
   - Warn about assumptions or edge cases
5. If no relevant regulations found → Explicitly state: "我在现有法规库中未找到相关规定"

**Technical Architecture**:
```typescript
// Hybrid search
const guidance_context = {
  // Semantic search
  relevant_chunks: await vector_search(user_query, {
    doc_category: 'knowledge',
    doc_type: 'regulation',
    similarity_threshold: 0.70
  }),

  // Structured keyword search
  applicable_articles: await supabase
    .from('structured_regulations')
    .select('*')
    .contains('keywords', extracted_keywords)
};

// LLM synthesis with strict citation requirements
const prompt = `
You MUST:
1. Cite specific articles: [《增值税法》第X条]
2. If no relevant regulation found, say "我在现有法规库中未找到相关规定"
3. Provide step-by-step guidance
4. Warn about assumptions or edge cases

Context: ${JSON.stringify(guidance_context)}
`;
```

**Success Criteria**:
- ✅ All guidance includes regulation citations
- ✅ Explicit "not found" when no regulations apply
- ✅ Hybrid search improves accuracy vs pure vector search
- ✅ Users can verify guidance against cited sources

---

### Technical Specifications

#### Database Schema (Dual Storage)

**Existing Tables** (Continue using):
```sql
-- documents: Document metadata
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  doc_category VARCHAR(20), -- 'knowledge' or 'business'
  doc_type VARCHAR(50), -- 'balance_sheet', 'regulation', etc.
  upload_time TIMESTAMP,
  status VARCHAR(20),
  size INTEGER,
  summary JSONB
);

-- document_chunks: Vector embeddings for semantic search
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  chunk_index INTEGER,
  content TEXT,
  embedding vector(1536), -- OpenAI text-embedding-3-small
  metadata JSONB
);
```

**New Tables** (To be created in Phase 3):
```sql
-- financial_data: Structured financial metrics
CREATE TABLE financial_data (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  data_type VARCHAR(50), -- 'balance_sheet', 'income_statement', etc.
  year VARCHAR(4),
  period VARCHAR(20), -- 'Q1', 'Q2', 'Q3', 'annual'
  metric_name VARCHAR(100), -- '流动资产.存货', '资产总计', etc.
  metric_value NUMERIC,
  unit VARCHAR(20), -- '元', '%', etc.
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_financial_data_lookup
ON financial_data(data_type, year, metric_name);

-- structured_regulations: Structured regulatory content
CREATE TABLE structured_regulations (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  article_number VARCHAR(50), -- '第一条', '第十三条', etc.
  title TEXT,
  content TEXT,
  keywords TEXT[], -- ['增值税', '税率', '13%']
  effective_date DATE,
  expiry_date DATE,
  parent_article VARCHAR(50), -- For nested regulations
  hierarchy JSONB, -- ["第十三条", "（一）", "1."]
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_regulations_keywords
ON structured_regulations USING GIN(keywords);

-- preset_functions: Calculation function definitions
CREATE TABLE preset_functions (
  id UUID PRIMARY KEY,
  name VARCHAR(100), -- 'debt_to_asset_ratio'
  display_name VARCHAR(100), -- '资产负债率'
  category VARCHAR(50), -- 'solvency', 'liquidity', 'profitability'
  formula TEXT, -- 'total_liabilities / total_assets'
  required_inputs JSONB, -- ['total_liabilities', 'total_assets']
  description TEXT,
  unit VARCHAR(20), -- '%', '元', 'times'
  validation_rules JSONB, -- Constraints on result
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### API Architecture Changes

**New API Route**: `/api/landing-chat` - LLM-driven conversation and routing
**Enhanced API Route**: `/api/upload` - Add admin mode with structured extraction
**Redesigned API Route**: `/api/financial-analysis` - Tool-calling architecture
**Enhanced API Route**: `/api/guidance-chat` - Hybrid search implementation

---

### Success Criteria

The upgraded system will be successful when:

1. **✅ Zero Calculation Errors**: All financial calculations are mathematically correct
2. **✅ No Hallucinations**: System says "I don't know" when appropriate rather than fabricating answers
3. **✅ Source Transparency**: Every answer cites specific source documents/regulations
4. **✅ Admin Flexibility**: Easy to upload new documents and have them properly structured
5. **✅ Excellent UX**: Natural language interface guides users effectively
6. **✅ Portfolio Quality**: Professional presentation demonstrating strong technical and product thinking

---

### Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Structured extraction accuracy < 95% | High | Medium | Add validation rules, manual correction interface |
| LLM routes to wrong function | Medium | Low | Comprehensive function descriptions, add verification layer |
| Password security insufficient | Low | Low | Acceptable for showcase; note in documentation |
| Preset functions don't cover user queries | Medium | High | Start with common ratios, build admin interface for adding new functions |
| Performance degradation with dual storage | Medium | Low | Proper indexing, query optimization |
| Regulation updates require manual work | Medium | Medium | Document update process, consider building admin upload interface |

---

### Dependencies

- ✅ Supabase PostgreSQL with pgvector (already configured)
- ✅ OpenAI API with function calling support (already available)
- ✅ Current RAG system (working, will enhance)
- ⏳ New database tables (to be created in Phase 3)
- ⏳ Preset calculation functions (to be implemented in Phase 3)
- ⏳ Admin authentication (to be implemented in Phase 3)

---

### Decisions Log

| Date | Decision | Rationale | Impact |
|------|----------|-----------|--------|
| 2025-11-12 | Dual storage architecture (structured + vector) | Balance between calculation accuracy and semantic flexibility | High - Core architectural change |
| 2025-11-12 | Hybrid chunking strategy (document-type-specific) | Preserves context while optimizing embedding performance | Medium - Affects RAG quality |
| 2025-11-12 | Simple password authentication | Appropriate security level for showcase project | Low - Easy to implement |
| 2025-11-12 | Start with 10-15 preset functions | Focus on common use cases, iterate based on usage | Medium - Defines initial scope |
| 2025-11-12 | Extract ALL line items from financial statements | Maximizes flexibility for future calculations | Medium - Increases initial complexity |
| 2025-11-12 | Chat-first landing page design | Showcases conversational AI capabilities | Medium - Major UX change |

---

## Phase 2: Design & Architecture ⏳ NEXT

**Status**: ⏳ Not Started

**Planned Start**: After Phase 1 approval

**Objectives**:
- Create detailed database schema with migrations
- Design API endpoint specifications
- Define preset calculation functions (10-15 ratios)
- Specify prompt templates for all modules
- Design UI components and workflows
- Create comprehensive design document

**Deliverables**:
- Database migration SQL files
- API endpoint design document
- Preset functions specification
- UI mockups/wireframes
- Updated prompts for each module
- Phase 2 documentation in this log

---

## Phase 3: Implementation ⏳ PENDING

**Status**: ⏳ Not Started

**Planned Start**: After Phase 2 approval

**Approach**: Iterative task-by-task implementation following development process:
- For each task: Implement → Test → Document
- Mark task complete before moving to next
- Update this log with progress

**Tasks** (To be defined in Phase 2):
- TBD based on Phase 2 design

---

## Phase 4: Testing & Validation ⏳ PENDING

**Status**: ⏳ Not Started

**Planned Start**: After Phase 3 completion

---

## Phase 5: Documentation ⏳ PENDING

**Status**: ⏳ Not Started

**Planned Start**: After Phase 4 completion

---

## Phase 6: Review & Deployment ⏳ PENDING

**Status**: ⏳ Not Started

**Planned Start**: After Phase 5 completion

---

## Development Notes

### Current Branch
- **Active Branch**: `development` (renamed from `guidance-chat-enhance`)
- **Stable Branch**: `main` (production version)
- All development work happens on `development` branch

### Resources
- Project Documentation: `CLAUDE.md`
- Development Process: Integrated in `CLAUDE.md`
- Supabase Setup: `supabase/README.md`

---

*Last Updated: 2025-11-12*
*Current Phase: Phase 1 (Completed) → Moving to Phase 2*
