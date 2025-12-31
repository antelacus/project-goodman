# Project Context

## Product Vision & Target Users

**Product**: AI-powered financial assistant for enterprise accounting departments

**Project Stage**: Evolving from demonstration project to production-ready tool

**Target Users** (Dual Audience):

| Audience | Purpose | Key Experience |
|----------|---------|----------------|
| **Potential Employers** | Showcase developer's capabilities in financial AI agent development | Landing page attraction, professional impression, technical demonstration |
| **Company Employees** | Daily work tool for accounting departments | Quick onboarding, efficient workflows, reliable functionality |

**User Profiles**:

- **Primary Users**: Financial personnel in accounting departments (会计部门财务人员)
- **Role**: Employees conducting financial analysis, compliance checking, and data extraction
- **Secondary Visitors**: Recruiters, hiring managers, technical evaluators exploring the project

**Core Value Proposition**:

- Reduce time spent on repetitive financial calculations and compliance lookups
- Provide AI-guided workflows instead of requiring users to navigate complex menus
- Enable natural language interaction with financial data and regulations
- Demonstrate real-world applicability of AI agent technology in finance

**Design Philosophy**:

- **Unified workspace interface**: Single entry point (工作台), AI routes to appropriate capabilities
- **Fewer choices, more guidance**: AI decides tools/modules, user focuses on questions
- **Transparency**: Show AI reasoning, document sources, calculation steps
- **Professional aesthetic**: Traditional corporate style that conveys security and reliability to financial users

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + pgvector)
- **AI**: OpenAI GPT-4o
- **Storage**: Supabase Storage (`document-files` bucket)
- **Cache/Sessions**: Redis
- **Libraries**: Zod (validation), bcryptjs (auth), expr-eval (calculations), xlsx (Excel parsing)

## Deployment Architecture

**Production**: Docker containers on VPS

- Next.js app runs in Docker container (`goodman`)
- Redis runs in Docker container (`goodman-redis`)
- nginx reverse proxy handles SSL and routing
- `docker-compose.yml` located in parent directory (`/home/deploy/goodman/`)

**Development**: Local Node.js

- Use `npm run dev` for local development
- Hot reload works normally
- Docker is only for production deployment

**Deployment Commands**:

```bash
# Deploy to production (from /home/deploy/goodman/)
cd /home/deploy/goodman && docker compose up -d --build goodman

# View logs
docker logs -f goodman

# Restart without rebuild
docker compose restart goodman
```

## Key Directories

- `src/app/` - Next.js App Router pages
  - `src/app/(landing)/` - Public landing page
  - `src/app/(workspace)/` - Authenticated workspace (chat, documents, help, about)
  - `src/app/api/chat/` - Unified agent API (sync + streaming)
  - `src/app/api/quick-actions/` - Standalone quick-action APIs (extract, etc.)
  - `src/app/api/admin/` - Admin endpoints (password verification, document upload)
  - `src/app/api/documents/` - Document management (DELETE, PATCH, preview, upload-temp)
  - `src/app/api/local-documents/` - Document list API (GET all documents with chunks)
- `src/lib/` - Core business logic (domain-based modules)
  - `src/lib/database/` - Database clients (Supabase, Redis, types)
  - `src/lib/documents/` - Document processing (search, chunker, parser, storage, constants)
  - `src/lib/extraction/` - Data extraction (AI, structured, column-based)
  - `src/lib/financial/` - Financial domain (preset-functions, metric-names, schema, validation)
  - `src/lib/security/` - Security utilities (admin-auth, session, rate-limiter, audit)
  - `src/lib/services/` - Core services (financial data query)
  - `src/lib/tools/` - Agent tool definitions (financial, search, extraction)
  - `src/lib/workflows/` - LangGraph workflows
    - `src/lib/workflows/core/` - Shared node implementations
    - `src/lib/workflows/unified/` - Unified agent graph
  - `src/lib/prompts/` - Prompt templates (`.txt` files + loader)
  - `src/lib/validation/` - API input validation schemas
- `src/components/` - React components (domain-based modules)
  - `src/components/chat/` - Chat UI (ChatWorkspace, MessageList, ChatInput, ThinkingIndicator)
  - `src/components/layout/` - Layout (Navbar, Sidebar, PageContainer, PageTitle)
  - `src/components/documents/` - Document UI (DocumentSelectModal, UploadFeedback)
  - `src/components/admin/` - Admin UI (PasswordModal)
  - `src/components/quick-actions/` - Quick action modals (ExtractionModal)
  - `src/components/providers/` - Context providers (ClientOnlyProvider)
- `supabase/migrations/` - Database migrations
- `docs/` - Design documents and development logs
- `tests/` - Test scripts
