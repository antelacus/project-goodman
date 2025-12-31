# CLAUDE.md

> **Document Purpose**: Instructions for AI assistants on how to collaborate with the project lead. This is a **reusable template** - copy to new projects and customize the Project Context section.
>
> | Audience | Update Frequency | Related Docs |
> |----------|------------------|--------------|
> | AI Assistant | When process changes | `.claude/rules/` for details |

---

## Quick Reference

**Tech Stack**: Next.js 15, React 19, Tailwind CSS, Supabase, Redis, LangGraph

**Essential Commands**:
```bash
npm run dev                                              # Local development
cd /home/deploy/goodman && docker compose up -d --build goodman  # Deploy
docker logs -f goodman                                   # View logs
```

**Phase Documentation**: `docs/development-documentation/V*_PHASE*.md`

---

## Development Process

> **Full details**: See `.claude/rules/development-process.md`

**IMPORTANT**: All development follows a phase-gated process with approvals between phases.

| Phase | Objective | Checkpoint |
|-------|-----------|------------|
| **1. Requirements** | Define what to build (PRD or Requirement Declaration) | → Wait for approval |
| **2. Design** | Plan architecture, create todo list | → Wait for approval |
| **3-5. Implementation** | Build, test, document (per task) | → Wait for confirmation |
| **6. Deployment** | Final review, deploy to production | → Wait for approval |

**Key Rule**: Wait for user confirmation after each task completion (context window management).

---

## Collaboration Guidelines

### About You (Project Lead)

- **Background**: Economics/Finance degree, self-taught tech (Python, SQL, JS, ML/LLM)
- **Languages**: English, 汉语普通话, Français, Español
- **Technical Level**: Strong analytical skills, learning coding

### My Role (Claude)

- **Question**: Ask clarifying questions freely
- **Suggest**: Propose better approaches
- **Correct**: Point out issues or better practices
- **Teach**: Explain technical concepts clearly
- **Guide**: Step-by-step through complex tasks

### Tool Usage

- **TodoWrite**: Track all tasks and progress
- **Task/Agents**: Complex research, exploration, parallel work
- **MCP Tools**: External services (Supabase, etc.)

### Development Guidelines

*These apply universally to all projects.*

#### Security

- Never store tokens/passwords in localStorage/sessionStorage (use HttpOnly cookies)
- Use `crypto.timingSafeEqual` for secret/token validation
- Zero-knowledge logging: log outcomes, never secrets or hints
- Server-only code needs explicit markers + runtime `typeof window` check

#### TypeScript

- Avoid `as any`; if unavoidable, add `// REASON: ...` comment
- Define shared types once in `src/types/`, never duplicate
- Wrap all `JSON.parse` in try-catch with graceful fallback

#### Error Handling

- Use single error response helper for consistent API format
- Validate all external inputs with schema validation (Zod)
- Propagate errors to users; never swallow silently

#### Code Hygiene

- Delete replaced code immediately; Git is your backup
- External configs belong in environment variables
- Expensive initializations happen once at startup, not per-request

---

## Project Context

> **Full details**: See `.claude/rules/project-context.md`

**Product**: AI-powered financial assistant for enterprise accounting departments

**Target Users**:
- Primary: Financial personnel (会计部门财务人员)
- Secondary: Recruiters/employers evaluating the project

**Architecture**: Docker on VPS (Next.js + Redis containers), nginx reverse proxy

---

## Code Conventions

> **Full details**: See `.claude/rules/code-conventions.md`

**Key Standards**:
- Tailwind CSS only (no inline styles)
- Zod for all API input validation
- Redis for persistent state (no in-memory Maps in production)
- LangGraph states must have explicit types (no `any`)
- Run `supabase gen types` after migrations

**Language**:
- Code: English
- UI/Business terms: Chinese (中文)
- Docs in `/docs`: Simplified Chinese
- CLAUDE.md, README: English

---

## Known Issues

> **Full details**: See `.claude/rules/known-issues.md`

- PDF parsing fails with plain text; use `.md` for testing
- Excel: `.xlsx` only, single sheet per file
- Vector index not yet created (small data volume)

---

## Modular Documentation

| File | Contents |
|------|----------|
| `.claude/rules/development-process.md` | Phase-gated workflow, checkpoints, PRD vs Requirement Declaration |
| `.claude/rules/project-context.md` | Product vision, tech stack, deployment, directory structure |
| `.claude/rules/code-conventions.md` | Coding standards, documentation, language rules |
| `.claude/rules/known-issues.md` | Gotchas and limitations |

---

*Template Version: 2.0*
*Origin: Project Goodman (2025)*
