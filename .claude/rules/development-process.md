# Development Process

> **Full Process**: See `~/.claude/CLAUDE.md` for complete development guidelines.
> This is a brief reference for common workflows.

## Version Semantics

```
v[MAJOR].[MINOR].[PATCH]
  │        │       └── Bug fixes, hotfixes
  │        └────────── Feature additions
  └─────────────────── Major milestones or breaking changes
```

## Minor Version Workflow (v*.*)

| Phase | Deliverable | Action |
|-------|-------------|--------|
| **Phase 1** | `v*.*_PHASE1_PRD.md` or `_REQ.md` | Requirements → pause for approval |
| **Phase 2** | `v*.*_PHASE2_DESIGN.md` | Design → create TRACK → pause for approval |
| **Phase 3-5** | `v*.*_PHASE3-5_TRACK.md` | Implement → test → document (per task) |
| **Phase 6** | Release | Quality gates → deploy → update docs → tag |

## Phase 6 Checklist (Quick Reference)

**Pre-Deployment**:
- [ ] All tasks in TRACK marked complete
- [ ] No TODO/FIXME in changed files
- [ ] Build succeeds (`npm run build`)
- [ ] Docker build succeeds

**Quality Gates**:
- [ ] Security audit (use security-auditor agent)
- [ ] Code review (use code-reviewer agent)
- [ ] Performance check (bundle size)

**Post-Deployment**:
- [ ] Update `CHANGELOG.md`
- [ ] Update `V*_DEVELOPMENT_PLAN.md`
- [ ] Update `package.json` version
- [ ] Tag release (`git tag -a v*.*.* -m "..."`)
- [ ] Push to remote with tags

## Patch Version (v*.*.*)

Quick fix process:
1. **Assess** - Reproduce, identify root cause
2. **Fix** - Minimal change, test the fix
3. **Deploy** - Commit with `fix(hotfix): ...`, deploy, verify
4. **Document** - Update KNOWN_ISSUES.md, CHANGELOG.md

## Git Conventions

**Branches**:
- `main` - production
- `development` - integration
- `feature/v*.*-description` - feature work
- `fix/v*.*.*-description` - bug fixes

**Commits**: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

## Key Documents

| Document | Purpose |
|----------|---------|
| `docs/PRODUCT_ROADMAP.md` | Product vision & priorities |
| `docs/versions/v*/V*_DEVELOPMENT_PLAN.md` | Major version planning |
| `docs/KNOWN_ISSUES.md` | Current bugs & limitations |
| `docs/TECHNICAL_DEBT.md` | Technical debt registry |
| `docs/DEPLOYMENT_CHECKLIST.md` | Deployment guide |
