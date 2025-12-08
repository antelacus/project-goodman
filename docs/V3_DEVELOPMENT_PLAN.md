# Project Goodman V3 Development Plan

This document captures ideas and plans for Version 3 development. These features require fundamental architectural changes and will be implemented after V2 is complete.

---

## Table of Contents

1. [Management Financial Statement System](#1-management-financial-statement-system)
2. [Intelligent Document System](#2-intelligent-document-system)
3. [VPS Migration](#3-vps-migration)
4. [Security Enhancements](#4-security-enhancements)
5. [LangGraph Migration](#5-langgraph-migration)

---

## 1. Management Financial Statement System

### Overview

Implement the **管理用财报体系** (Management Financial Statement System) which reconstructs traditional financial statements for deeper analysis.

### Background Discussion (2024-12-03)

We analyzed whether current financial data is sufficient to construct management system indicators. Key findings:

#### Data Availability Analysis

| Category | Indicators | Data Status |
|----------|------------|-------------|
| **Balance Sheet Reconstruction** | 净经营资产, 净负债 | ⚠️ Requires operating/financial classification logic |
| **Income Statement Reconstruction** | 税前经营利润, 税后经营净利润, 税后利息费用 | ✅ Available (tax rate can be calculated) |
| **Cash Flow Reconstruction** | 营业现金毛流量, 营业现金净流量, 实体现金流量 | ❌ Needs 折旧与摊销, period comparison |
| **Management Ratios** | 净经营资产净利率, 税后利息率, 净财务杠杆, 管理用ROE | ⚠️ Depends on above |

#### Key Challenges Identified

1. **Operating vs Financial Classification**
   - Need business logic to classify assets/liabilities
   - 金融资产: 货币资金, 交易性金融资产, 债权投资, etc.
   - 金融负债: 短期借款, 长期借款, 应付债券, etc.
   - 经营资产: 应收账款, 存货, 固定资产, etc.
   - 经营负债: 应付账款, 预收款项, 应付职工薪酬, etc.

2. **Depreciation & Amortization (折旧与摊销)**
   - Not directly available in standard financial statements
   - Found in 财务报表附注 (Notes to Financial Statements)
   - Requires text-based extraction from annual reports

3. **Period Comparison Data**
   - Metrics like "净经营资产增加" need data from two periods
   - Solution: Database already supports `metric_value_previous` column
   - Need to ensure extraction populates both periods

4. **Tax Rate Calculation**
   - Can be calculated: `所得税费用 / 利润总额`
   - Need edge case handling for negative profits

#### Formulas to Implement

**Balance Sheet Reconstruction:**
```
净经营资产 = 经营资产 - 经营负债 = 净负债 + 股东权益
净负债 = 金融负债 - 金融资产
```

**Income Statement Reconstruction:**
```
税前经营利润 = 营业收入 - 营业成本 - 税金及附加 - 销售/管理费用 (不含利息)
税后经营净利润 = 税前经营利润 × (1 - 所得税税率)
税后利息费用 = 利息费用 × (1 - 所得税税率)
```

**Cash Flow Reconstruction:**
```
营业现金毛流量 = 税后经营净利润 + 折旧与摊销
营业现金净流量 = 营业现金毛流量 - 经营营运资本增加
实体现金流量 = 营业现金净流量 - 资本支出
融资现金流量 = 债务现金流量 + 股权现金流量
```

**Management Ratios:**
```
净经营资产净利率 = 税后经营净利润 / 净经营资产
税后利息率 = 税后利息费用 / 净负债
净财务杠杆 = 净负债 / 股东权益
管理用ROE = 净经营资产净利率 + (净经营资产净利率 - 税后利息率) × 净财务杠杆
```

### Implementation Dependencies

This feature depends on [Intelligent Document System](#2-intelligent-document-system) because:
- 折旧与摊销 data is in text-based annual reports
- AI needs to automatically find and extract this data
- Multi-period comparison requires smart document selection

### Proposed Implementation Phases

1. **Phase 1**: Implement asset/liability classification logic
2. **Phase 2**: Add income statement reconstruction (feasible with current data)
3. **Phase 3**: Integrate with Intelligent Document System for cash flow reconstruction
4. **Phase 4**: Complete management ratios and 管理用ROE

---

## 2. Intelligent Document System

### Overview

Replace manual document selection with AI-powered automatic document discovery and selection.

### Background Discussion (2024-12-03)

Two key insights drove this design:

1. **Multi-Period Data**: Chinese financial statements typically include both current and prior year columns (本期金额, 上期金额). Instead of storing separately, AI should understand and extract both periods from the same document.

2. **Text-Based Financial Data**: Documents like "2024年度财务报告" contain critical data (折旧与摊销) in text form within 财务报表附注. AI needs to automatically find and extract from these documents.

### Current Architecture (V2)

```
User → Manually selects documents → AI extracts from selected docs → Calculate
```

**Limitations:**
- User must know which document contains what data
- Cannot combine structured tables with text notes
- Manual selection is tedious for complex calculations

### Proposed Architecture (V3) - Option C: Smart Default

**Decision**: Implement Option C (Smart Default with Override)

```
┌─────────────────────────────────────────────────────────────┐
│  User Question: "计算2024年的营业现金毛流量"                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: AI Understands Data Requirements                   │
│  - 税后经营净利润 (from income statement)                    │
│  - 折旧与摊销 (from financial notes/annual report)          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: AI Searches Documents (Vector + Keyword)           │
│  Query: "2024 折旧 摊销 固定资产"                            │
│  Results:                                                   │
│    - 2024年度财务报告.pdf (score: 0.92)                      │
│    - 2024利润表.xlsx (score: 0.85)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: AI Extracts Data from Multiple Sources             │
│  From 利润表: 税后经营净利润 = 600,000                       │
│  From 年度报告附注: 折旧与摊销 = 150,000                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Calculate & Show Sources                           │
│  营业现金毛流量 = 600,000 + 150,000 = 750,000               │
│  Sources: [利润表.xlsx, 年度报告.pdf]                        │
│  [User can override document selection if needed]           │
└─────────────────────────────────────────────────────────────┘
```

### Existing Infrastructure (Already Built in V2)

| Component | Status | Notes |
|-----------|--------|-------|
| Vector embeddings | ✅ Exists | `document_chunks.embedding` column |
| Multi-period storage | ✅ Exists | `financial_data.metric_value_previous` column |
| Semantic search | ✅ Exists | Can query `document_chunks` by similarity |
| Keywords | ✅ Exists | `document_chunks.keywords` column |

### New Components Needed

1. **New Document Types**
   ```typescript
   'annual_report'     // 年度财务报告 (comprehensive)
   'financial_notes'   // 财务报表附注 (detailed notes)
   ```

2. **Document Search API**
   - Input: data requirements (metric names, year, keywords)
   - Output: ranked list of relevant documents
   - Uses vector similarity + keyword matching

3. **Multi-Document Extraction**
   - Extract from structured tables (Excel)
   - Extract from text notes (PDF/Word)
   - Combine data from multiple sources

4. **Source Transparency UI**
   - Show which documents AI selected
   - Allow user to override/add documents
   - Display confidence scores

### Implementation Tasks

1. Add new document types to `document-constants.ts`
2. Create document search API endpoint
3. Enhance extraction to handle text-based notes
4. Update financial analysis API to auto-search documents
5. Add source display and override UI
6. Ensure multi-period extraction works correctly

---

## 3. VPS Migration

### Overview

Migrate from Vercel (free tier) to a VPS for better control over compute resources as the project grows.

### Motivation

- Increasing computation requirements (AI extraction, vector search)
- Vercel free tier limitations (function timeout, memory)
- Need for background jobs (document processing)
- Better cost control at scale

### Current Vercel Limitations (Free Tier)

| Limitation | Free Tier | Impact |
|------------|-----------|--------|
| Serverless Function Timeout | 10 seconds | Long AI extractions may fail |
| Serverless Function Memory | 1024 MB | Large document processing limited |
| Edge Function Duration | 30 seconds | OK for most operations |
| Bandwidth | 100 GB/month | May hit limits with file uploads |
| Build Time | 45 minutes | Sufficient |
| Concurrent Builds | 1 | Sufficient |

### Migration Difficulty Analysis

#### Easy Parts ✅

1. **Next.js on VPS**: Standard deployment
   - Next.js runs natively on Node.js
   - Can use PM2 for process management
   - No code changes needed

2. **Database (Supabase)**: No migration needed
   - Supabase is already external
   - Just update connection strings if needed

3. **Environment Variables**: Simple transfer
   - Copy `.env` to VPS
   - Use systemd or PM2 for env management

#### Medium Difficulty ⚠️

1. **Reverse Proxy Setup**
   - Need Nginx or Caddy configuration
   - SSL certificate management (Let's Encrypt)
   - Domain DNS configuration

2. **File Storage**
   - Currently using Supabase Storage
   - No change needed, but could move to local storage for speed

3. **Background Jobs**
   - Currently limited by serverless
   - On VPS: can use Bull/BullMQ with Redis
   - Better for long-running document processing

#### Considerations 🤔

1. **DevOps Overhead**
   - Need to manage server updates
   - Monitor uptime
   - Handle scaling manually

2. **Cost Comparison**
   | Option | Monthly Cost | Notes |
   |--------|--------------|-------|
   | Vercel Free | $0 | Limited, may hit walls |
   | Vercel Pro | $20 | Better limits |
   | VPS (Basic) | $5-10 | Full control, DigitalOcean/Vultr |
   | VPS (Good) | $20-40 | More RAM/CPU for AI tasks |

3. **Deployment Pipeline**
   - Need to set up CI/CD (GitHub Actions → VPS)
   - Or manual deployment with git pull

### Recommended VPS Specifications

For this project's requirements:

| Spec | Minimum | Recommended |
|------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 80 GB SSD |
| Bandwidth | 2 TB | 4 TB |

**Estimated Cost**: $20-40/month (DigitalOcean, Vultr, or Hetzner)

### Migration Steps

1. **Provision VPS**
   - Choose provider (DigitalOcean, Vultr, Hetzner, AWS Lightsail)
   - Install Ubuntu 22.04 LTS

2. **Install Dependencies**
   ```bash
   # Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs

   # PM2
   npm install -g pm2

   # Nginx
   sudo apt install -y nginx
   ```

3. **Deploy Application**
   ```bash
   git clone <repo>
   npm install
   npm run build
   pm2 start npm --name "goodman" -- start
   ```

4. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **SSL with Certbot**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

6. **Set Up CI/CD** (Optional)
   - GitHub Actions workflow for auto-deploy
   - Or simple webhook-based deployment

### Verdict

**Difficulty: Medium** - Not hard, but requires some DevOps knowledge.

**Recommendation**:
- If comfortable with Linux/server management: Migrate to VPS
- If prefer managed: Consider Vercel Pro ($20/month) first
- Can start with cheap VPS ($10/month) and scale up

---

## Version 3 Roadmap

### Priority Order

1. **VPS Migration** (Foundation)
   - Removes compute limitations
   - Enables longer processing times
   - Required for heavy AI operations

2. **Intelligent Document System** (Core Feature)
   - Transforms user experience
   - Required for Management Financial System
   - Biggest architectural change

3. **Management Financial Statement System** (Advanced Feature)
   - Builds on Intelligent Document System
   - Completes financial analysis capabilities
   - Differentiating feature

### Timeline Estimate

| Phase | Feature | Duration |
|-------|---------|----------|
| V3.0 | VPS Migration | 1-2 days |
| V3.1 | Intelligent Document System | 1-2 weeks |
| V3.2 | Management Financial System | 1 week |

---

## 4. Security Enhancements

### Overview

Security improvements identified during V2 Phase 6 audit. These are recommended for production deployment beyond MVP demo.

### Background (2025-12-03)

During V2 deployment preparation, a comprehensive security audit was conducted. The following improvements were identified but deferred to V3 to allow MVP deployment.

### Current State (V2 MVP)

**Implemented**:
- ✅ RLS enabled on all 7 tables
- ✅ Admin password verification
- ✅ Service key server-side only
- ✅ Supabase parameterized queries (SQL injection protection)
- ✅ Client-side rate limiting (localStorage)

**Known Limitations**:
- ⚠️ No server-side rate limiting
- ⚠️ Plain text password comparison (no bcrypt)
- ⚠️ Detailed error messages exposed in API responses
- ⚠️ No input length validation
- ⚠️ Missing security headers

### Security Enhancements Roadmap

#### Tier 1: Critical (Production Required)

| Enhancement | Description | Implementation |
|-------------|-------------|----------------|
| **Server-side Rate Limiting** | Prevent API abuse and DoS | Use Redis + `rate-limiter-flexible` |
| **Input Length Validation** | Prevent oversized requests | Add max length checks to all string inputs |
| **Error Message Sanitization** | Prevent information disclosure | Remove `details` field from error responses |

**Implementation Details - Rate Limiting**:
```typescript
// Example: Redis-based rate limiting
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl',
  points: 10,        // 10 requests
  duration: 60,      // per 60 seconds
  blockDuration: 60, // block for 60 seconds if exceeded
});

// Apply to all API routes
export async function rateLimit(ip: string) {
  try {
    await rateLimiter.consume(ip);
    return true;
  } catch {
    return false; // Rate limited
  }
}
```

#### Tier 2: High Priority

| Enhancement | Description | Implementation |
|-------------|-------------|----------------|
| **Password Hashing** | Store hashed passwords | Use bcrypt for ADMIN_PASSWORD |
| **Session Tokens** | Replace per-request password auth | JWT or secure session cookies |
| **Brute Force Protection** | Lock after failed attempts | Exponential backoff + account lockout |
| **File Path Validation** | Prevent path traversal | Validate `fileUrl` parameter in preview API |

**Implementation Details - Password Hashing**:
```typescript
// Store hashed password in env/db
// At startup or setup:
const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

// Verification:
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const storedHash = process.env.ADMIN_PASSWORD_HASH;
  return bcrypt.compare(password, storedHash);
}
```

#### Tier 3: Medium Priority

| Enhancement | Description | Implementation |
|-------------|-------------|----------------|
| **Security Headers** | CORS, CSP, X-Frame-Options | Next.js middleware or `next.config.js` |
| **File Content Validation** | Magic number checks | Validate file signatures before processing |
| **Audit Logging** | Track admin operations | Log to database with timestamp, action, result |
| **Function Search Path** | Fix Supabase warnings | Add `SET search_path = public` to functions |

**Implementation Details - Security Headers**:
```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
```

### Database Security Fixes

**Function Search Path** (6 functions to fix):
```sql
-- Example fix for search_financial_data
CREATE OR REPLACE FUNCTION public.search_financial_data(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Add this line
AS $$
BEGIN
  ...
END;
$$;
```

**Functions to update**:
1. `search_financial_data`
2. `search_regulations_hybrid`
3. `get_financial_metrics_by_year`
4. `match_documents`
5. `get_document_with_chunks`
6. `get_documents_by_category`

### Dependencies

| Enhancement | Requires |
|-------------|----------|
| Server-side rate limiting | Redis (or Upstash Redis for serverless) |
| Session tokens | Redis for session storage |
| Audit logging | New database table |

### Integration with VPS Migration

If migrating to VPS (Section 3), security enhancements become easier:
- Redis can run locally on VPS
- No serverless constraints on session management
- Better logging and monitoring options

### Priority for V3 Implementation

1. **V3.0 (with VPS)**: Rate limiting + Error sanitization
2. **V3.1**: Password hashing + Session tokens
3. **V3.2**: Security headers + Audit logging
4. **V3.3**: Database function fixes + File validation

---

## 5. LangGraph Migration

### Overview

Migrate the AI orchestration layer from manual tool-calling patterns to LangGraph's StateGraph framework. This enables better state management, conversation memory, agentic loops, streaming, and improved testability.

### Background (2025-12-05)

Analysis of the current codebase revealed that the existing architecture already exhibits agent-like patterns that map naturally to LangGraph:

| Current Pattern | LangGraph Equivalent |
|-----------------|---------------------|
| Manual tool execution loops | `ToolNode` (automatic) |
| Step-wise state (route → query → calculate → score → explain) | `StateGraph` nodes + edges |
| Conditional logic (sufficient data? confidence passed?) | Conditional edges |
| Per-request state | Graph `State` with annotations |

### Benefits of Migration

1. **Conversation Memory** — Currently only landing-chat has history; LangGraph makes this trivial across all modules
2. **Agentic Loops** — Enable retry/refinement patterns (e.g., "try another metric if first fails")
3. **Streaming Responses** — Send intermediate results to the UI as the graph executes
4. **Better Error Recovery** — Define explicit error edges instead of try-catch everywhere
5. **Observability** — LangGraph's debugging/tracing tools visualize graph execution
6. **Cleaner Code** — Replace 500+ line route files with declarative graphs

### Current Architecture Analysis

#### Tightly Coupled Areas Identified

**Financial Analysis** (`/api/financial-analysis/route.ts` - 623 lines):
- Lines 265-277: LLM function selection baked into route handler
- Lines 299-447: Dynamic metric retrieval logic interleaved with main flow
- Lines 464-580: Data validation, calculation, and formatting mixed together
- Lines 582-602: LLM explanation generation separated from calculation context

**Guidance Chat** (`/api/guidance-chat/route.ts` - 509 lines):
- Lines 98-245: Hybrid search (keyword + vector) tightly integrated
- Lines 255-378: Tool calling for financial metrics baked into LLM prompt flow
- Lines 383-425: Related articles retrieval separate from citations

**Landing Chat** (`/api/landing-chat/route.ts` - 224 lines):
- Lines 54-123: Keywords hardcoded, routing logic opaque
- Lines 128-157: Question suggestions hardcoded per module
- Lines 175-190: LLM call for reply

#### Implicit Workflows Identified

**Financial Analysis (5 steps)**:
```
Route Question → Query Data → Validate Inputs → Execute Calculation → Score Confidence → Generate Explanation
```

**Guidance Chat (5 steps)**:
```
Hybrid Search → Generate Guidance → Execute Tools (optional) → Find Related → Score Confidence
```

**Landing Chat (4 steps)**:
```
Generate Reply → Analyze Intent → Route to Module → Generate Suggestions
```

---

### Preparatory Refactoring (Before Adding LangGraph)

These refactors can be done incrementally while V2 is in production, making the eventual LangGraph migration straightforward.

#### Phase A: Extract Explicit State Types (Priority: Critical)

**Why**: LangGraph uses explicit state objects with annotations. Currently state is scattered across variables.

**Create**: `src/lib/types/workflow-states.ts`

```typescript
// Financial Analysis State
export interface FinancialAnalysisState {
  // Input
  question: string;
  year?: string;
  period?: string;
  documentIds?: string[];

  // Step 1: Function Selection
  selectedFunction?: PresetFunction;
  functionConfidence?: number;

  // Step 2: Data Query
  queriedMetrics?: string[];
  financialData?: any[];

  // Step 3: Validation
  missingMetrics?: string[];
  dataQuality?: number;

  // Step 4: Calculation
  calculation?: CalculationResult;
  rawResult?: ExecutionResult;

  // Step 5: Confidence
  confidenceScore?: ConfidenceScore;

  // Step 6: Explanation
  explanation?: string;
  sourceDocuments?: SourceDocument[];

  // Error handling
  error?: string;
  errorType?: 'no_function' | 'insufficient_data' | 'low_confidence' | 'calculation_error';
}

// Guidance State
export interface GuidanceState {
  question: string;
  uploadedDocument?: DocumentUpload;
  documentIds: string[];

  // Step 1: Search
  citations?: Citation[];
  semanticSimilarity?: number;

  // Step 2: LLM Generation
  guidance?: string;
  toolCallsExecuted?: ToolCallResult[];

  // Step 3: Related Articles
  relatedArticles?: RelatedArticle[];

  // Step 4: Confidence
  confidenceScore?: ConfidenceScore;

  // Metadata
  warnings?: string[];
  searchDocIds?: string[];
  error?: string;
}

// Landing Chat State
export interface LandingChatState {
  message: string;
  conversationHistory: ChatMessage[];

  // Step 1: Reply Generation
  reply?: string;
  llmConfidence?: number;

  // Step 2: Intent Analysis
  userIntent?: string;
  intentClarity?: number;

  // Step 3: Module Routing
  suggestedModule?: ModuleInfo;
  routingConfidence?: number;

  // Step 4: Suggestions
  suggestedQuestions?: string[];

  // Step 5: Confidence
  overallConfidence?: ConfidenceScore;
  error?: string;
}
```

---

#### Phase B: Extract Workflow Steps as Pure Functions (Priority: High)

**Why**: LangGraph nodes are functions that take state and return state. Extract logic now.

**Create directory structure**:
```
src/workflows/
├── financial-analysis/
│   ├── steps/
│   │   ├── select-function.ts      // LLM picks the function
│   │   ├── query-data.ts           // Fetch from Supabase
│   │   ├── validate-inputs.ts      // Check completeness
│   │   ├── execute-calculation.ts  // Run preset function
│   │   ├── score-confidence.ts     // Multi-metric scoring
│   │   └── generate-explanation.ts // LLM explanation
│   └── index.ts                    // Orchestration (thin wrapper)
├── guidance-chat/
│   ├── steps/
│   │   ├── hybrid-search.ts        // Keyword + vector search
│   │   ├── generate-guidance.ts    // LLM with context
│   │   ├── execute-tools.ts        // Tool execution
│   │   └── find-related.ts         // Related articles
│   └── index.ts
└── landing-chat/
    ├── steps/
    │   ├── generate-reply.ts       // LLM conversational
    │   ├── analyze-intent.ts       // Intent extraction
    │   └── route-module.ts         // Module selection
    └── index.ts
```

**Example step function** (LangGraph-ready pattern):

```typescript
// src/workflows/financial-analysis/steps/select-function.ts
import { FinancialAnalysisState } from '@/lib/types/workflow-states';
import { presetFunctions, findPresetFunction } from '@/lib/preset-functions';

export async function selectFunction(
  state: FinancialAnalysisState
): Promise<FinancialAnalysisState> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.question }
    ],
    tools: functionDefinitions,
    tool_choice: 'auto',
    temperature: 0.1,
  });

  const toolCall = completion.choices[0].message.tool_calls?.[0];

  if (!toolCall) {
    return {
      ...state,
      errorType: 'no_function',
      error: '无法识别适合的计算功能',
    };
  }

  return {
    ...state,
    selectedFunction: findPresetFunction(toolCall.function.name),
    functionConfidence: 0.9,
  };
}
```

---

#### Phase C: Centralize Tool Definitions (Priority: Medium)

**Why**: LangGraph's `ToolNode` uses a tool registry. Centralize now.

**Create**: `src/lib/tools/index.ts`

```typescript
import { executeFunction } from '@/lib/preset-functions';

// Tool definitions for OpenAI function calling
export const TOOLS = {
  financialAnalysis: [
    {
      type: 'function' as const,
      function: {
        name: 'calculate_preset_function',
        description: '执行预设的财务计算功能，如流动比率、ROE等',
        parameters: {
          type: 'object',
          properties: {
            function_name: { type: 'string', description: '功能名称' },
            year: { type: 'string', description: '财务年份' },
            period: { type: 'string', description: '会计期间' },
          },
          required: ['function_name'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'get_financial_metric',
        description: '从数据库获取特定财务指标',
        parameters: {
          type: 'object',
          properties: {
            metric_name: { type: 'string', description: '指标名称' },
            year: { type: 'string' },
            period: { type: 'string' },
          },
          required: ['metric_name'],
        },
      },
    },
  ],

  guidanceChat: [
    {
      type: 'function' as const,
      function: {
        name: 'calculate_financial_metric',
        description: '计算财务指标（在合规指导中需要计算时使用）',
        parameters: {
          type: 'object',
          properties: {
            metric_name: { type: 'string' },
            inputs: { type: 'object' },
          },
          required: ['metric_name', 'inputs'],
        },
      },
    },
  ],
};

// Tool executor registry (maps tool names to implementations)
export const TOOL_EXECUTORS: Record<string, (args: any) => Promise<any>> = {
  calculate_preset_function: async (args) => executeFunction(args.function_name, args.inputs),
  get_financial_metric: async (args) => queryFinancialMetric(args.metric_name, args.year, args.period),
  calculate_financial_metric: async (args) => executeFunction(args.metric_name, args.inputs),
};
```

**Also extract routing keywords**: `src/lib/routing/keywords.ts`

```typescript
export const ROUTING_KEYWORDS = {
  'data-extract': ['提取', '读取', 'pdf', 'excel', '解析', '上传', '文档分析'],
  'financial-analysis': ['计算', '分析', '指标', '比率', 'roe', 'roa', '净利润率', '周转率'],
  'guidance-chat': ['税', '合规', '法规', '政策', '增值税', '企业所得税', '会计准则']
};

export const MODULE_SUGGESTIONS: Record<string, string[]> = {
  'data-extract': ['我该如何上传文档？', '支持哪些文档格式？'],
  'financial-analysis': ['可以计算哪些财务指标？', '需要上传什么类型的文档？'],
  'guidance-chat': ['你可以回答哪些税务问题？', '有哪些会计准则可以查询？']
};
```

---

#### Phase D: Consolidate Types (Priority: Medium)

**Move scattered types to central location**:

```
src/lib/types/
├── index.ts                    // Re-export everything
├── workflow-states.ts          // State objects (from Phase A)
├── financial-analysis.ts       // Request/Response types
├── guidance-chat.ts            // Request/Response types
├── landing-chat.ts             // Chat message types
└── common.ts                   // Shared types (ConfidenceScore, etc.)
```

---

#### Phase E: Create Error Type Hierarchy (Priority: Low)

**Create**: `src/lib/errors/workflow-errors.ts`

```typescript
export enum WorkflowErrorType {
  INPUT_VALIDATION = 'input_validation',
  NO_FUNCTION = 'no_function',
  INSUFFICIENT_DATA = 'insufficient_data',
  LOW_CONFIDENCE = 'low_confidence',
  LLM_ERROR = 'llm_error',
  DATABASE_ERROR = 'database_error',
}

export class WorkflowError extends Error {
  constructor(
    public type: WorkflowErrorType,
    public userMessage: string,  // 中文用户提示
    message: string,
    public suggestion?: string
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

// Usage in workflow steps
export function handleWorkflowError(error: unknown): WorkflowError {
  if (error instanceof WorkflowError) return error;

  return new WorkflowError(
    WorkflowErrorType.LLM_ERROR,
    '处理请求时出错，请稍后重试',
    error instanceof Error ? error.message : 'Unknown error'
  );
}
```

---

### Post-Refactoring: Thin Route Handlers

After preparatory refactoring, route handlers become simple orchestrators:

```typescript
// src/app/api/financial-analysis/route.ts (after refactoring)
// ~50 lines instead of 623

import { FinancialAnalysisState } from '@/lib/types/workflow-states';
import { selectFunction } from '@/workflows/financial-analysis/steps/select-function';
import { queryData } from '@/workflows/financial-analysis/steps/query-data';
import { validateInputs } from '@/workflows/financial-analysis/steps/validate-inputs';
import { executeCalculation } from '@/workflows/financial-analysis/steps/execute-calculation';
import { scoreConfidence } from '@/workflows/financial-analysis/steps/score-confidence';
import { generateExplanation } from '@/workflows/financial-analysis/steps/generate-explanation';

export async function POST(request: Request) {
  const body = await request.json();

  // Initialize state
  let state: FinancialAnalysisState = {
    question: body.question,
    documentIds: body.documentIds,
    year: body.year,
    period: body.period,
  };

  // Run workflow (easily replaced with LangGraph later)
  state = await selectFunction(state);
  if (state.error) return errorResponse(state);

  state = await queryData(state);
  state = await validateInputs(state);
  if (state.error) return errorResponse(state);

  state = await executeCalculation(state);
  state = await scoreConfidence(state);
  state = await generateExplanation(state);

  return NextResponse.json(buildResponse(state));
}
```

---

### LangGraph Implementation (Future)

Once preparatory refactoring is complete, adding LangGraph is straightforward:

```typescript
// src/workflows/financial-analysis/graph.ts
import { StateGraph, END } from '@langchain/langgraph';
import { FinancialAnalysisState } from '@/lib/types/workflow-states';
import { selectFunction } from './steps/select-function';
import { queryData } from './steps/query-data';
import { validateInputs } from './steps/validate-inputs';
import { executeCalculation } from './steps/execute-calculation';
import { scoreConfidence } from './steps/score-confidence';
import { generateExplanation } from './steps/generate-explanation';

// Define the graph
const financialAnalysisGraph = new StateGraph<FinancialAnalysisState>({
  channels: {
    question: { value: (a, b) => b ?? a },
    selectedFunction: { value: (a, b) => b ?? a },
    financialData: { value: (a, b) => b ?? a },
    // ... other state channels
  }
})
  .addNode("select_function", selectFunction)
  .addNode("query_data", queryData)
  .addNode("validate_inputs", validateInputs)
  .addNode("execute_calculation", executeCalculation)
  .addNode("score_confidence", scoreConfidence)
  .addNode("generate_explanation", generateExplanation)
  .addNode("handle_error", handleError)

  // Define edges
  .addEdge("__start__", "select_function")
  .addConditionalEdges(
    "select_function",
    (state) => state.error ? "error" : "continue",
    { error: "handle_error", continue: "query_data" }
  )
  .addEdge("query_data", "validate_inputs")
  .addConditionalEdges(
    "validate_inputs",
    (state) => state.error ? "error" : "continue",
    { error: "handle_error", continue: "execute_calculation" }
  )
  .addEdge("execute_calculation", "score_confidence")
  .addEdge("score_confidence", "generate_explanation")
  .addEdge("generate_explanation", END)
  .addEdge("handle_error", END);

export const financialAnalysisExecutor = financialAnalysisGraph.compile();

// Usage in route handler
const result = await financialAnalysisExecutor.invoke({
  question: body.question,
  documentIds: body.documentIds,
});
```

---

### Implementation Priority

| Phase | Task | Effort | Impact | LangGraph Benefit |
|-------|------|--------|--------|-------------------|
| **A** | Extract state types | Low | High | Direct mapping to StateGraph annotations |
| **B** | Extract step functions | Medium | Very High | Become graph nodes directly |
| **C** | Centralize tools | Low | High | Plug into ToolNode |
| **D** | Consolidate types | Low | Medium | Cleaner imports |
| **E** | Error hierarchy | Low | Medium | Use conditional edges for error paths |

### Suggested Order

1. **Phase A** first (creates foundation for everything else)
2. **Phase B** next (biggest impact, enables testing)
3. **Phase C + D** can be done together (quick wins)
4. **Phase E** last (lowest priority)

### Dependencies

- No external dependencies for preparatory refactoring
- LangGraph migration requires: `@langchain/langgraph`, `@langchain/core`
- Optional: `@langchain/openai` (or continue using `openai` directly)

### Integration with Other V3 Features

| V3 Feature | LangGraph Benefit |
|------------|-------------------|
| **Intelligent Document System** | Add document search as a graph node; enable retry if first search fails |
| **Management Financial System** | Complex multi-step calculations benefit from explicit state graph |
| **VPS Migration** | LangGraph's streaming works better with persistent connections |

---

## Notes & Ideas

(Space for future ideas as they come up)

- Consider adding user authentication if deploying publicly
- Explore caching strategies for repeated calculations
- Consider WebSocket for real-time extraction progress
