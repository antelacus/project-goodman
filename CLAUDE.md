# CLAUDE.md

> **Scope**: Project-specific configuration only.
> **Global settings**: `~/.claude/CLAUDE.md` (development process, documentation philosophy, universal guidelines)

---

## Project Context

**Product**: AI-powered financial assistant for enterprise accounting departments

**Project Stage**: Evolving from demonstration project to production-ready tool

**Target Users**:

- **Primary**: Financial personnel in accounting departments (会计部门财务人员)
- **Secondary**: Recruiters, hiring managers evaluating the project

**Core Value**:

- Reduce time on repetitive financial calculations and compliance lookups
- AI-guided workflows instead of complex menu navigation
- Natural language interaction with financial data and regulations
- Transparency in AI reasoning, document sources, calculation steps

**Design Philosophy**:

- **Unified workspace**: Single entry point (工作台), AI routes to capabilities
- **Fewer choices, more guidance**: AI decides tools, user focuses on questions
- **Professional aesthetic**: Corporate style conveying security and reliability

---

## Tech Stack

| Category | Choice |
|----------|--------|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Backend | Supabase (PostgreSQL + pgvector) |
| AI | OpenAI GPT-4o |
| Storage | Supabase Storage (`document-files` bucket) |
| Cache/Sessions | Redis |
| Libraries | Zod, bcryptjs, expr-eval, xlsx |

---

## Deployment

**Production**: Docker on VPS (port 3000)

- `goodman` container (Next.js app)
- `goodman-redis` container (Redis)
- nginx reverse proxy + SSL
- `docker-compose.yml` in `$GOODMAN_PROD_DIR/`

**Staging**: Docker on same VPS (port 3001)

- Auto-deploys when pushing to `development` branch
- Runs smoke tests (health, auth, sessions, reports)
- Directory: `$GOODMAN_STAGING_DIR/`

**Development**: `npm run dev` (local Node.js with hot reload)

---

## Key Directories

```
src/app/                    # Next.js App Router
  ├── (landing)/            # Public landing page
  ├── (workspace)/          # Workspace (chat, documents, help)
  └── api/                  # API routes (chat, admin, documents, quick-actions)

src/lib/                    # Core business logic
  ├── database/             # Supabase, Redis clients
  ├── documents/            # Document processing (search, chunker, parser)
  ├── financial/            # Financial domain (preset-functions, metrics)
  ├── security/             # Auth, session, rate-limiter
  ├── tools/                # Agent tool definitions
  ├── workflows/            # LangGraph workflows
  └── prompts/              # Prompt templates (.txt files)

src/components/             # React components
  ├── chat/                 # Chat UI
  ├── layout/               # Navbar, Sidebar
  └── documents/            # Document UI

supabase/migrations/        # Database migrations
docs/                       # Development documentation
tests/                      # Test scripts
```

---

## Living Documentation

| Document | Contents |
|----------|----------|
| [docs/PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md) | Product roadmap, version planning |
| [docs/TECHNICAL_DEBT.md](docs/TECHNICAL_DEBT.md) | Technical debt, known limitations, gotchas |
| [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md) | Deployment checklist |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, deployment topology, data flows |
| [docs/SECURITY.md](docs/SECURITY.md) | Security boundaries, key management, disclosure process |
| [docs/INCIDENT_RUNBOOK.md](docs/INCIDENT_RUNBOOK.md) | Incident response, rollback procedures |
| [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) | GlitchTip, Uptime Kuma setup and usage |

---

*Project Goodman (2025)*
