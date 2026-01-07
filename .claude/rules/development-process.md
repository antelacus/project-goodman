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

## Patch Version (v*.*.*)

Quick fix process:

1. **Assess** - Reproduce, identify root cause
2. **Fix** - Minimal change, test the fix
3. **Deploy** - Commit with `fix(hotfix): ...`, deploy, verify
4. **Document** - Update KNOWN_ISSUES.md, CHANGELOG.md
