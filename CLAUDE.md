# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Process

**IMPORTANT**: All development work must follow this phase-gated process with approvals between major phases.

### Overview
We follow a phase-gated approach where each phase requires approval before proceeding. Within the implementation cycle, we work iteratively on individual tasks.

### Phase 1: Requirements & Planning
**Objective**: Establish clear understanding of what we need to accomplish

**Activities**:
- Discuss feature/task requirements in detail
- Clarify any ambiguities or questions
- Define success criteria and goals
- Identify dependencies and potential risks
- Consider user experience and business value

**Deliverable**: Shared understanding of the requirement

**→ CHECKPOINT: Wait for approval before proceeding to Phase 2**

### Phase 2: Design & Architecture
**Objective**: Plan the technical implementation approach

**Activities**:
- Propose technical architecture and approach
- Design database schema changes (if applicable)
- Plan API endpoints and data flows
- Consider scalability, security, and performance
- **Create or update design documents** (critical for new projects)
- Present the overall structure with diagrams if helpful

**Deliverable**: Design document and architecture proposal

**→ CHECKPOINT: Wait for approval before proceeding**
**→ ACTION: Create comprehensive todo list of all implementation tasks**

### Iterative Development Cycle (Phases 3-4-5)
**For each task on the todo list, execute the following cycle:**

#### Phase 3: Implementation
**Objective**: Implement the specific task

**Activities**:
- Mark task as "in progress" in todo list
- Write code following project conventions and best practices
- Implement incrementally with clear, focused changes
- Handle errors and edge cases
- Follow security best practices
- Write clean, maintainable code with appropriate comments

**Deliverable**: Working implementation of the task

#### Phase 4: Testing & Validation
**Objective**: Verify the implementation works correctly

**Activities**:
- **Functional Testing**: Test the feature works as intended
- **Edge Case Testing**: Test boundary conditions and error scenarios
- **Integration Testing**: Verify it works with existing code
- **Security Testing**: Check for common vulnerabilities (XSS, injection, etc.)
- **Regression Testing**: Ensure no existing functionality is broken
- **Manual Testing**: Test in the actual environment when possible

**Deliverable**: Verified, tested implementation

#### Phase 5: Documentation
**Objective**: Update documentation and track progress

**Activities**:
- Update relevant documentation (README, CLAUDE.md, etc.)
- Add/update code comments for complex logic
- Update design documents if implementation differs from design
- Mark task as "completed" in todo list
- Document any decisions or trade-offs made

**Deliverable**: Updated documentation and completed task

**→ REPEAT: Move to next task and repeat Phases 3-4-5 until all tasks complete**

### Phase 6: Review & Deployment
**Objective**: Final review and prepare for production
*(Only after ALL tasks on todo list are complete)*

**Activities**:
- Comprehensive review of all changes
- Final testing of integrated system
- Make any requested adjustments
- Prepare deployment checklist
- Update version numbers if applicable
- Create deployment plan

**Deliverable**: Production-ready feature

**→ CHECKPOINT: Final approval before deployment**

### Collaboration Guidelines

#### About You (Project Lead)
- **Background**: Economics/Finance degree, self-taught tech (Python, SQL, JS, ML/LLM)
- **Languages**: English, Mandarin Chinese, Français, Español
- **Technical Level**: Strong analytical skills, growing coding expertise

#### My Role (Claude)
- **Question**: Don't hesitate to ask clarifying questions
- **Suggest**: Propose better approaches or alternatives
- **Correct**: Point out potential issues or better practices
- **Help**: Explain technical concepts clearly
- **Guide**: Provide step-by-step guidance through complex tasks

#### General Principles
- ✅ **Use tools proactively**: MCP, subagents, and other available tools
- ✅ **Explain technical concepts**: Assume non-CS background
- ✅ **Wait for approval**: Between major phases
- ✅ **Iterate incrementally**: One task at a time
- ✅ **Document everything**: Keep docs updated as we go
- ✅ **Test thoroughly**: Each task before moving to the next

#### Tool Usage
- **TodoWrite**: Track all implementation tasks and progress
- **Task/Agents**: Use for complex research, exploration, or parallel work
- **MCP Tools**: Leverage when working with external services
- **Read/Edit/Write**: File operations
- **Bash**: For running tests, builds, deployments

#### Checkpoints Summary
1. ✋ After Phase 1 (Requirements) → Get approval
2. ✋ After Phase 2 (Design + Todo List) → Get approval
3. 🔄 Phases 3-4-5 iterate per task (no checkpoint between tasks)
4. ✋ After Phase 6 (Final Review) → Get approval for deployment

### Phase Documentation
All development phases are tracked in `DEVELOPMENT_LOG.md`. This log is updated at the end of each phase to record decisions, progress, and next steps.

## Project Overview

Project Goodman is an AI-powered financial assistant application with three core modules:
1. **Data Extraction** (`/data-extract`) - Extracts structured information from financial documents (PDFs, invoices, contracts)
2. **Financial Analysis** (`/financial-analysis`) - Performs conversational financial metric calculations and analysis using RAG
3. **Compliance Guidance** (`/guidance-chat`) - Provides regulatory compliance advice by combining knowledge documents (regulations) with business documents

Built with **Next.js 15**, **React 19**, **TypeScript**, **Zustand**, **Tailwind CSS 4**, **Supabase (PostgreSQL + pgvector)**, and **OpenAI GPT-4.1**.

## Development Commands

```bash
# Start development server (with Turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint

# Migrate data to Supabase (one-time setup)
npm run migrate-data

# Dry run migration (test without writing)
npm run migrate-data:dry-run
```

Development server runs on `http://localhost:3000`

## Environment Setup

Required environment variables in `.env.local`:
```
# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Optional: Override prompt templates with `PROMPT_DATA_EXTRACT`, `PROMPT_FINANCIAL_ANALYSIS`, `PROMPT_GUIDANCE_CHAT` (defaults to files in `src/lib/prompts/`)

## Architecture

### Serverless-First Design
- All AI processing happens in Next.js API routes (`src/app/api/*/route.ts`)
- Export `runtime = "nodejs"` for server-side functionality
- Supabase PostgreSQL backend with connection pooling for serverless compatibility
- Document parsing (PDF/Excel) happens client-side
- Designed for Vercel deployment

### Database Architecture (Supabase + pgvector)
**Backend**: PostgreSQL with pgvector extension for vector similarity search

**Tables**:
1. **documents** - Document metadata
   - Columns: id, name, doc_category (knowledge/business), doc_type, upload_time, status, size, summary (JSONB)
   - Stores both knowledge and user-uploaded business documents

2. **document_chunks** - Text chunks with embeddings
   - Columns: id, document_id (FK), chunk_index, content (TEXT), embedding (vector(1536))
   - Embeddings generated using OpenAI text-embedding-3-small

**Functions**:
- `match_documents(query_embedding, match_count, filter_doc_ids)` - Vector similarity search using cosine distance
- Returns top-K most similar chunks with similarity scores

**Setup**: See `supabase/README.md` for complete setup instructions

### RAG (Retrieval Augmented Generation) System
1. Documents are chunked (~1000 chars) and embedded using OpenAI Embeddings API
2. Embeddings stored in Supabase `document_chunks` table with pgvector
3. User queries are embedded and Supabase RPC performs fast vector search
4. Retrieved chunks + user query are sent to GPT-4.1 for contextual answers
5. Supabase handles cosine similarity calculation natively (no manual calculation needed)

**Vector Search Flow**:
```typescript
// 1. Generate query embedding
const embedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: userQuery
});

// 2. Search similar chunks in Supabase
const { data: chunks } = await supabase.rpc('match_documents', {
  query_embedding: embedding.data[0].embedding,
  match_count: 3,
  filter_doc_ids: selectedDocIds // Optional filter
});

// 3. Build context and query GPT-4.1
const context = chunks.map(c => c.content).join('\n');
const response = await openai.chat.completions.create({...});
```

### Document Management
**Two document categories**:
- **Knowledge documents** (knowledge): Pre-loaded regulatory/reference docs migrated to Supabase
- **Business documents** (business): User-uploaded documents stored in Supabase

**Storage Flow**:
1. Client uploads document → API parses and chunks text
2. Generate embeddings for each chunk via OpenAI API
3. Insert document + chunks into Supabase (transactional)
4. Zustand store (`src/store/documents.ts`) caches documents for UI

**Document Structure**:
```typescript
{
  id: string;
  name: string;
  type: "pdf" | "excel" | "txt" | "csv" | "knowledge" | "business";
  docCategory: "knowledge" | "business";
  status: "processing" | "ready" | "error";
  summary?: DocumentSummary; // Generated by GPT-4.1
  chunks?: DocumentChunk[]; // text + embedding + chunkIndex
}
```

### Prompt Engineering
- Prompt templates stored in `src/lib/prompts/*.txt`:
  - `data-extract.txt` - Document information extraction
  - `financial-analysis.txt` - Financial metric calculation
  - `guidance-chat.txt` - Compliance guidance
- Helper functions in `src/lib/prompts.ts` load templates and inject variables
- Use placeholders like `{TEXT}`, `{QUESTION}`, `{DOC_LIST}`, `{KNOWLEDGE_LIST}`, `{BUSINESS_LIST}`

### LaTeX Formula Rendering
- Financial calculations returned as inline LaTeX: `$$formula$$`
- Rendered using `katex` + `react-markdown` with `remark-math` and `rehype-katex`
- Component `HighlightLatex.tsx` makes formulas clickable and verifiable with `mathjs`
- All numbers formatted with 2 decimal places and thousand separators

## Key Files & Directories

```
src/
├── app/
│   ├── api/                          # API routes (serverless functions)
│   │   ├── data-extract/route.ts     # Document extraction endpoint
│   │   ├── financial-analysis/route.ts # RAG-based financial analysis (Supabase)
│   │   ├── guidance-chat/route.ts    # RAG-based compliance guidance (Supabase)
│   │   ├── documents/route.ts        # Document CRUD operations (Supabase)
│   │   ├── local-documents/route.ts  # Load knowledge documents from Supabase
│   │   └── upload/route.ts           # Document upload handling
│   ├── data-extract/page.tsx         # Data extraction UI
│   ├── financial-analysis/page.tsx   # Financial analysis UI
│   ├── guidance-chat/page.tsx        # Compliance guidance UI
│   ├── documents/page.tsx            # Document management UI
│   └── layout.tsx                    # Root layout with Navbar
├── components/                       # Reusable UI components
│   ├── Navbar.tsx                    # Top navigation
│   ├── DocumentManager.tsx           # Document list & category filtering
│   ├── DocumentSelectModal.tsx       # Multi-select document picker
│   ├── ChatInputBox.tsx              # Chat input with preset questions
│   ├── HighlightLatex.tsx            # Clickable LaTeX formula renderer
│   └── LatexCalcModal.tsx            # LaTeX formula verification modal
├── lib/
│   ├── supabase.ts                   # Supabase client singleton
│   ├── database.types.ts             # TypeScript database types
│   ├── prompts.ts                    # Prompt template loaders
│   ├── prompts/*.txt                 # Raw prompt templates
│   ├── latexUtils.tsx                # LaTeX parsing and highlighting
│   ├── presetQuestions.ts            # Pre-defined user questions
│   └── rateLimit.ts                  # Simple rate limiting utility
└── store/
    └── documents.ts                  # Zustand document store

supabase/
├── migrations/
│   └── 20250107000000_init_vector_database.sql  # Database schema
└── README.md                         # Setup instructions

scripts/
└── migrate-to-supabase.ts            # Data migration script

data/
└── documents/                        # Legacy JSON files (migrated to Supabase)
    ├── 增值税法.json
    ├── 数据资源准则.json
    └── 2024年度资产负债表.json
```

## Important Patterns

### Adding New AI Features
1. Create prompt template in `src/lib/prompts/*.txt`
2. Add loader function in `src/lib/prompts.ts`
3. Create API route in `src/app/api/your-feature/route.ts`:
   ```typescript
   export const runtime = "nodejs";
   import OpenAI from "openai";
   import { createServerSupabaseClient } from "../../../lib/supabase";

   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
   const supabase = createServerSupabaseClient();
   ```
4. Create page in `src/app/your-feature/page.tsx`
5. Update Navbar with new route

### Working with Supabase Database
**Queries**:
```typescript
// Server-side (API routes)
import { createServerSupabaseClient } from "../../../lib/supabase";
const supabase = createServerSupabaseClient();

// Client-side (components)
import { createBrowserSupabaseClient } from "../lib/supabase";
const supabase = createBrowserSupabaseClient();

// Example: Fetch documents
const { data, error } = await supabase
  .from('documents')
  .select('*')
  .eq('doc_category', 'knowledge');
```

**Vector Search**:
```typescript
const { data: chunks } = await supabase.rpc('match_documents', {
  query_embedding: embedding,
  match_count: 3,
  filter_doc_ids: ['doc-1', 'doc-2'] // Optional
});
```

### Adding New Knowledge Documents
**Method 1: Via Migration Script** (Recommended)
1. Place JSON file in `data/documents/`
2. Format: Array of `{ content: string, embedding: number[] }`
3. Run `npm run migrate-data`

**Method 2: Manual Upload**
1. Chunk document (~1000 chars per chunk)
2. Generate embeddings: `openai.embeddings.create({ model: "text-embedding-3-small", input: chunk })`
3. Insert via SQL or API:
   ```sql
   INSERT INTO documents (id, name, doc_category, ...) VALUES (...);
   INSERT INTO document_chunks (id, document_id, content, embedding, ...) VALUES (...);
   ```

### Database Schema Updates
1. Create new migration file in `supabase/migrations/`
2. Run SQL in Supabase dashboard SQL editor
3. Update `src/lib/database.types.ts` (or regenerate with Supabase CLI)

### LaTeX Formula Pattern
AI responses should return formulas as: `$$净利润 = 100,000.00 - 50,000.00 = 50,000.00$$`
- Use inline LaTeX (same line)
- Include full calculation steps
- Format numbers with 2 decimals and thousand separators

## Testing & Debugging

- Check browser console for client-side errors
- Check terminal output for API route errors
- Verify `.env.local` has valid `OPENAI_API_KEY` and Supabase credentials
- Use `console.log()` in API routes to debug (output visible in terminal)
- Test vector search in Supabase SQL editor:
  ```sql
  SELECT * FROM match_documents(
    query_embedding := (SELECT embedding FROM document_chunks LIMIT 1),
    match_count := 5
  );
  ```
- Check Supabase logs in dashboard for database errors

## Database Setup (First Time)

1. **Create Supabase Project**:
   - Go to supabase.com and create free project
   - Note your project URL and anon key

2. **Run Migration**:
   - Copy SQL from `supabase/migrations/20250107000000_init_vector_database.sql`
   - Paste in Supabase SQL Editor and execute

3. **Configure Environment**:
   - Add Supabase credentials to `.env.local`

4. **Migrate Data**:
   - Run `npm run migrate-data` to import existing documents

5. **Create Vector Index** (after data migration):
   ```sql
   CREATE INDEX idx_document_chunks_embedding ON document_chunks
   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
   ```

See `supabase/README.md` for detailed setup instructions.

## Deployment

**Vercel + Supabase** (recommended):
1. Push to GitHub
2. Import repository in Vercel
3. Set environment variables in Vercel dashboard:
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Framework preset: **Next.js**
5. Build command: `npm run build`
6. Output directory: `.next`
7. Deploy

Supabase free tier handles serverless workloads via connection pooling (PgBouncer).

## Important Considerations

- **API Costs**: Each query generates embeddings + GPT-4.1 completion. Monitor OpenAI usage.
- **Database Limits**: Supabase free tier has 500MB storage, 5GB bandwidth/month (sufficient for demo scale)
- **Vector Index**: Create IVFFlat index after bulk data insertion for better performance
- **Connection Pooling**: Supabase handles this automatically for serverless functions
- **Persistence**: All documents now persist in Supabase (no data loss on refresh)
- **Rate limiting**: Simple in-memory rate limit in `src/lib/rateLimit.ts`. Consider Redis for production.
- **Security**: Validate all file uploads. Current implementation trusts user input. Use Supabase RLS (Row Level Security) for multi-tenant scenarios.
- **Auto-pause**: Supabase free tier auto-pauses after 7 days inactivity (instant wake-up on request)
