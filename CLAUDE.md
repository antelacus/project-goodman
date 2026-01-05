# CLAUDE.md

> **Scope**: Project-specific configuration only.
> **Global settings**: `~/.claude/CLAUDE.md` (development process, documentation philosophy, universal guidelines)

---

## Quick Reference

```bash
npm run dev                                              # Local development
cd /home/deploy/goodman && docker compose up -d --build goodman  # Deploy
docker logs -f goodman                                   # View logs
```

---

## Project Rules

All project-specific conventions are in `.claude/rules/`:

| Rule File | Contents |
|-----------|----------|
| [project-context.md](.claude/rules/project-context.md) | Product vision, tech stack, target users, deployment architecture, key directories |
| [code-conventions.md](.claude/rules/code-conventions.md) | Coding standards, API patterns, styling rules, language standards |

## Living Documentation

| Document | Contents |
|----------|----------|
| [docs/KNOWN_ISSUES.md](docs/issues/KNOWN_ISSUES.md) | Current bugs, gotchas, limitations (updated during development) |

---

*Template Version: 2.3 | Project Goodman (2025)*
