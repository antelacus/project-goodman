---
description: Validate current development phase completion status
---

# Phase Check Command

Verify that the current development phase requirements are met before proceeding.

## Development Phases

From `.claude/rules/development-process.md`:

| Phase | Deliverable | Checkpoint |
|-------|-------------|------------|
| 1 | PRD or Requirement Declaration | Wait for approval |
| 2 | Design document + Todo list | Wait for approval |
| 3-5 | Implementation + Testing + Docs | Per-task confirmation |
| 6 | Final review + Deployment | Final approval |

## Phase 1 Checklist (Requirements)

- [ ] Requirement document exists in `docs/`
- [ ] PRD (user-facing) or Requirement Declaration (internal)
- [ ] Success criteria defined
- [ ] Dependencies identified

## Phase 2 Checklist (Design)

- [ ] Design document exists in `docs/`
- [ ] Architecture decisions documented
- [ ] Database schema changes planned
- [ ] API design specified
- [ ] Comprehensive todo list created

## Phase 3-5 Checklist (Implementation Cycle)

For each task:
- [ ] Task marked "in progress" in todo list
- [ ] Code implemented following conventions
- [ ] Tests written/updated
- [ ] Documentation updated
- [ ] Task marked "completed"

## Phase 6 Checklist (Deployment)

- [ ] All tasks on todo list completed
- [ ] Final integration testing done
- [ ] Security audit passed
- [ ] Documentation current (README, CLAUDE.md)
- [ ] CHANGELOG updated
- [ ] Deployment checklist prepared

## Usage

```
/phase-check        # Check overall phase status
/phase-check 2      # Verify Phase 2 completion
/phase-check $ARGUMENTS
```

## Output

Report showing:
- Current phase
- Completed requirements
- Missing requirements
- Recommended next steps
