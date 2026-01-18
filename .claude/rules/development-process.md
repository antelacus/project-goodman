# Development Process

> This is a brief reference for common workflows.

## Version Semantics

```
v[MAJOR].[MINOR].[PATCH]
  │        │       └── Bug fixes, hotfixes
  │        └────────── Feature additions
  └─────────────────── Major milestones or breaking changes
```

## Major Version Workflow (v*)

See global guidance file for details.

## Minor Version Workflow (v*.*)

| Phase | Deliverable | Action |
|-------|-------------|--------|
| **Phase 1** | `PHASE1_PRD.md` or `_REQ.md` | Requirements → pause for approval |
| **Phase 2** | `PHASE2_DESIGN.md` | Design → create TRACK → pause for approval |
| **Phase 3-5** | `PHASE3-5_TRACK.md` | Implement → document (per task) → test (all tasks) |
| **Phase 6** | Release | Verify CI + staging → merge to main → tag |

## Worktrees & Task Execution

- **Default**: work directly on `development`; do not create worktrees unless explicitly requested.
- **Task order**: execute sequentially on `development`; commit after each task and update the track doc.
- **On push**: CI runs automatically (lint, test, build); staging auto-deploys with smoke tests.
- **Dependencies**: keep dependent tasks on `development`. Only use worktrees/feature branches when the user explicitly requests isolation for parallel work.
- **Finish**: verify CI + staging pass → merge `development` into `main` → tag release.

## Patch Version (v*.*.*)

Quick fix process:

1. **Assess** - Reproduce, identify root cause
2. **Fix** - Minimal change, test the fix
3. **Deploy** - Commit with `fix(hotfix): ...`, deploy, verify
4. **Document** - Update CHANGELOG.md
