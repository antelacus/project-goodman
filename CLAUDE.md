# CLAUDE.md

> **Scope**: Project-specific configuration only. Development process, documentation philosophy, and universal guidelines are in `~/.claude/CLAUDE.md`.

---

## Quick Reference

**Tech Stack**: Next.js 15, React 19, Tailwind CSS, Supabase, Redis, LangGraph

**Commands**:
```bash
npm run dev                                              # Local development
cd $GOODMAN_PROD_DIR && docker compose up -d --build goodman  # Deploy
docker logs -f goodman                                   # View logs
```

**Phase Docs**: `docs/development-documentation/V*_PHASE*.md`

---

## Project Context

> **Full details**: `.claude/rules/project-context.md`

**Product**: AI-powered financial assistant for enterprise accounting departments

**Users**:
- Primary: Financial personnel (会计部门财务人员)
- Secondary: Recruiters/employers evaluating the project

**Architecture**: Docker on VPS (Next.js + Redis), nginx reverse proxy

---

## Code Conventions

> **Full details**: `.claude/rules/code-conventions.md`

**Standards**:
- Tailwind CSS only (no inline styles)
- Zod for all API input validation
- Redis for persistent state (no in-memory Maps)
- LangGraph states must have explicit types
- Run `supabase gen types` after migrations

**Language**:
- Code: English
- UI/Business terms: Chinese (中文)
- Docs in `/docs`: Simplified Chinese
- CLAUDE.md, README: English

---

## Known Issues

> **Full details**: `.claude/rules/known-issues.md`

- PDF parsing fails with plain text; use `.md` for testing
- Excel: `.xlsx` only, single sheet per file
- Vector index not yet created (small data volume)

---

## Documentation Map

| Location | Contents |
|----------|----------|
| `~/.claude/CLAUDE.md` | Development process, documentation philosophy, universal guidelines |
| `.claude/rules/project-context.md` | Product vision, tech stack, directories |
| `.claude/rules/code-conventions.md` | Coding standards, language rules |
| `.claude/rules/known-issues.md` | Gotchas and limitations |

---

*Template Version: 2.2 | Project Goodman (2025)*
