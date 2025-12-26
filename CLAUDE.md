# CLAUDE.md

> **Document Purpose**: This file provides instructions for AI assistants (Claude Code, etc.) on how to collaborate with the project lead. It defines the development workflow, approval checkpoints, and collaboration guidelines. This is a **reusable template** - copy to new projects and customize the "Project Context" section.
>
> | Audience | Update Frequency | Related Docs |
> |----------|------------------|--------------|
> | AI Assistant | When process changes | README (user-facing), DESIGN (architecture), TRACK (progress) |

---

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

**Deliverable**: PRD or Requirement Declaration (see guidelines below)

#### Choosing Between PRD and Requirement Declaration

| Document Type | When to Use | Focus |
|---------------|-------------|-------|
| **Requirement Declaration** | Infrastructure, migrations, refactoring, internal technical work | Technical "what" and "how" |
| **PRD (Product Requirements Document)** | User-facing features, product changes, UX modifications | User needs, stories, journeys |

**Key Principle**: The deciding factor is **user visibility**, not complexity.

- If users will notice or interact with the change → **PRD** (includes user stories, personas, UX flows)
- If the change is internal/invisible to users → **Requirement Declaration** (technical specs only)

**Examples**:

- VPS Migration → Requirement Declaration (infrastructure, users won't notice)
- Security Hardening → Requirement Declaration (internal improvement)
- Smart Document System → PRD (changes user interaction)
- New Financial Reports → PRD (new user-facing feature)

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

**Design Document Guidelines**:

- **Focus on design, not implementation**: Explain architectural decisions, not code details
- **Keep it reviewable**: Concise (~100-200 lines), easy to scan, clear sections
- **Use diagrams**: Architecture diagrams, data flow charts when helpful
- **Code examples**: Minimal - only to illustrate patterns, not full implementations

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

- Update relevant documentation (DEVELOPMENT_TRACK, README, CLAUDE.md, etc.)
- Add/update code comments for complex logic
- Update design documents if implementation differs from design
- Mark task as "completed" in todo list
- Document any decisions or trade-offs made

**Deliverable**: Updated documentation and completed task

**→ CHECKPOINT: Wait for user confirmation before proceeding to next task**
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

---

## Collaboration Guidelines

### About You (Project Lead)

- **Background**: Economics/Finance degree, self-taught tech (Python, SQL, JS, ML/LLM)
- **Languages**: English, 汉语普通话, Français, Español
- **Technical Level**: Strong analytical skills, terrible coding expertise

### My Role (Claude)

- **Question**: Don't hesitate to ask clarifying questions
- **Suggest**: Propose better approaches or alternatives
- **Correct**: Point out potential issues or better practices
- **Help and teach**: Explain technical concepts clearly
- **Guide**: Provide step-by-step guidance through complex tasks

### General Principles

- **Use tools proactively**: MCP, subagents, and other available tools
- **Explain technical concepts**: Adjust depth based on project lead's background
- **Wait for approval**: Between major phases
- **Iterate incrementally**: One task at a time
- **Document everything**: Keep docs updated as we go
- **Test thoroughly**: Each task before moving to the next

### Tool Usage

- **TodoWrite**: Track all implementation tasks and progress
- **Task/Agents**: Use for complex research, exploration, or parallel work
- **MCP Tools**: Leverage when working with external services
- **Read/Edit/Write**: File operations
- **Bash**: For running tests, builds, deployments

### Checkpoints Summary

1. After Phase 1 (Requirements) → Get approval
2. After Phase 2 (Design + Todo List) → Get approval
3. **After each task completion** (Phases 3-4-5) → Wait for user confirmation
4. After Phase 6 (Final Review) → Get approval for deployment

**Note**: The per-task checkpoint (step 3) is critical for context window management. This pause allows the user to track token usage and prevents exceeding context limits.

---

## Project Context

### Product Vision & Target Users

**Product**: AI-powered financial assistant for enterprise accounting departments

**Target Users**:

- **Primary**: Financial personnel in accounting departments (会计部门财务人员)
- **Role**: Employees conducting financial analysis, compliance checking, and data extraction
- **Context**: Internal company tool for efficiency enhancement (not B2C)

**Core Value Proposition**:

- Reduce time spent on repetitive financial calculations and compliance lookups
- Provide AI-guided workflows instead of requiring users to navigate complex menus
- Enable natural language interaction with financial data and regulations

**Design Philosophy**:

- **Unified conversational interface**: Single chat entry point, AI routes to appropriate capabilities
- **Fewer choices, more guidance**: AI decides tools/modules, user focuses on questions
- **Transparency**: Show AI reasoning, document sources, calculation steps

### Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + pgvector)
- **AI**: OpenAI GPT-5-mini
- **Storage**: Supabase Storage (`document-files` bucket)
- **Libraries**: Zod (validation), bcryptjs (auth), expr-eval (calculations), xlsx (Excel parsing)
- **State**: Persistent Session ID (frontend & backend sync)

### Deployment Architecture

**Production**: Docker containers on VPS

- Next.js app runs in Docker container (`goodman`)
- Redis runs in Docker container (`goodman-redis`)
- nginx reverse proxy handles SSL and routing
- `docker-compose.yml` located in parent directory (`/home/deploy/goodman/`)

**Development**: Local Node.js

- Use `npm run dev` for local development (unchanged)
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

### Key Directories

- `src/app/` - Next.js App Router pages
  - `src/app/chat/` - Unified chat workspace (main entry point)
  - `src/app/documents/` - Document management
  - `src/app/api/chat/` - Unified agent API (sync + streaming)
  - `src/app/api/tools/` - Standalone tool APIs (extract, etc.)
  - `src/app/api/admin/` - Admin endpoints (password verification, document upload)
  - `src/app/api/documents/` - Document CRUD + preview
- `src/lib/` - Core business logic
  - `src/lib/services/` - Core services (financial data query, etc.)
  - `src/lib/prompts/` - Prompt templates (`.txt` files)
  - `src/lib/tools/` - Tool definitions (financial, compliance, extraction)
  - `src/lib/workflows/` - LangGraph workflows
    - `src/lib/workflows/core/` - Shared node implementations
    - `src/lib/workflows/unified/` - Unified agent graph
    - `src/lib/workflows/shared/` - Shared utilities
  - `src/lib/preset-functions.ts` - 22 financial calculation functions
  - `src/lib/financial-metric-names.ts` - Standardized metric name constants
  - `src/lib/document-constants.ts` - Document type/period display mappings
  - `src/lib/document-search.ts` - Hybrid search service (RRF fusion)
  - `src/lib/document-selector.ts` - Intelligent document selection orchestrator
- `src/components/` - React components
  - `src/components/chat/` - Chat UI components (ChatWorkspace, MessageList, ChatInput, ThinkingIndicator, ExtractionResultModal)
  - `src/components/AdminPasswordTrigger.tsx` - Admin password modal
  - `src/components/DocumentSelectModal.tsx` - Document selection modal
  - `src/components/Navbar.tsx` - Navigation bar with route highlighting
- `supabase/migrations/` - Database migrations
- `docs/` - Design documents and development logs
- `tests/` - Test scripts

### Code Conventions

- Prompt templates stored in `src/lib/prompts/*.txt`, loaded via `src/lib/prompts.ts`
- Financial metric names defined as constants in `financial-metric-names.ts` (no hardcoded strings)
- Document types and periods use mapping constants in `document-constants.ts`
- Use Zod for API input validation (schemas in `src/lib/validation/api-schemas.ts`)
- Database: structured tables for exact queries, vector embeddings for semantic search
- Admin operations require password verification via `admin-auth.ts`
- Document search uses hybrid retrieval (vector + keyword) with RRF fusion scoring
- Workflow shared logic goes in `src/lib/workflows/shared/` for reuse across modules
- Document selection supports both auto (AI) and manual (user override) modes

### Code Documentation Standards

**Philosophy**: The project lead reviews rather than writes code. Documentation should enable understanding of **architecture and intent**, not line-by-line mechanics. Well-named code is self-documenting; comments explain "why", not "what".

**Three Levels of Documentation**:

1. **Architecture Level** (in `docs/` folder)
   - System overview and data flows
   - Key concepts and patterns used
   - For external libraries: explanation of core concepts (e.g., "What is a LangGraph StateGraph?")

2. **File Level** (only for complex/entry-point files)
   - Brief header: purpose + key exports
   - Skip for simple utility files where the filename is self-explanatory

3. **Code Level** (minimal, targeted)
   - **DO comment**: Non-obvious business logic, workarounds, "why" decisions
   - **DON'T comment**: Obvious operations, standard patterns, self-explanatory code

**For External Libraries**:

- Create ONE reference doc (e.g., `docs/LANGGRAPH_CONCEPTS.md`) explaining key concepts
- In code, use descriptive naming that maps to those concepts
- Don't repeat library documentation in every file

**Example - Good vs Over-documented**:

```typescript
// ❌ Over-documented (noisy)
/**
 * Calculates the debt-to-equity ratio
 * @param totalDebt - The total debt amount
 * @param totalEquity - The total equity amount
 * @returns The debt-to-equity ratio as a number
 */
function calculateDebtToEquity(totalDebt: number, totalEquity: number): number {
  // Divide debt by equity to get ratio
  return totalDebt / totalEquity;
}

// ✅ Self-documenting (clean)
function calculateDebtToEquity(totalDebt: number, totalEquity: number): number {
  return totalDebt / totalEquity;
}

// ✅ Comment only when "why" is non-obvious
function calculateDebtToEquity(totalDebt: number, totalEquity: number): number {
  // Return 0 instead of Infinity when equity is zero (company-specific rule)
  if (totalEquity === 0) return 0;
  return totalDebt / totalEquity;
}
```

**Language Standards**:

- **Code**: English for all code (functions, variables, comments)
- **User-facing content**: Chinese (中文) for UI strings, labels, business domain terms (财务指标名称)
- **Documentation in `/docs`**: **Simplified Chinese (简体中文)** for all documents (PRDs, design docs, development tracks), while keeping code examples and technical terminology in English
- **CLAUDE.md, README.md, CHANGELOG.md**: English (for broader accessibility)

### Known Issues & Gotchas

- PDF parsing fails with plain text content; use `.md` files for testing
- Excel parsing only supports `.xlsx` (not `.xls`), single sheet per file
- Vector index (IVFFlat) not yet created due to small data volume (<1000 chunks)
- 12 database indexes currently unused - may optimize after production usage analysis
- TOC detection requires actual document body to be far enough from TOC (3000+ chars)
- 3 RPC functions have mutable search_path warnings (documented, not critical)

---

## Phase Documentation

All development phases are tracked in a dedicated `*_DEVELOPMENT_TRACK.md` file. This log is updated at the end of each phase to record decisions, progress, and next steps.

- `docs/V*_PHASE1_REQUIREMENT_DECLARATION.md` - Requirement document (deliver PRD if development is user-faced)
- `docs/V*_PHASE2_DESIGN.md` - Design document (architecture, ER diagrams, API design)
- `docs/V*_PHASE3-6_DEVELOPMENT_TRACK.md` - Implementation log

---

*Template Version: 1.0*
*Origin: Project Goodman (2025)*
