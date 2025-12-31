# CLAUDE.md

> **Document Purpose**: Project-specific instructions for AI assistants. Universal preferences are in `~/.claude/CLAUDE.md`.
>
> | Audience | Update Frequency | Related Docs |
> |----------|------------------|--------------|
> | AI Assistant | When project changes | `.claude/rules/` for details |

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
| `~/.claude/CLAUDE.md` | Personal preferences, universal guidelines (applies to all projects) |
| `.claude/rules/development-process.md` | Phase-gated workflow, checkpoints |
| `.claude/rules/project-context.md` | Product vision, tech stack, deployment |
| `.claude/rules/code-conventions.md` | Coding standards, documentation |
| `.claude/rules/known-issues.md` | Gotchas and limitations |

---

*Template Version: 2.1*
*Origin: Project Goodman (2025)*
