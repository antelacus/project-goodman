# Development Process

**IMPORTANT**: All development work must follow this phase-gated process with approvals between major phases.

## Overview

We follow a phase-gated approach where each phase requires approval before proceeding. Within the implementation cycle, we work iteratively on individual tasks.

## Phase 1: Requirements & Planning

**Objective**: Establish clear understanding of what we need to accomplish

**Activities**:

- Discuss feature/task requirements in detail
- Clarify any ambiguities or questions
- Define success criteria and goals
- Identify dependencies and potential risks
- Consider user experience and business value

**Deliverable**: PRD or Requirement Declaration (see guidelines below)

### Choosing Between PRD and Requirement Declaration

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

## Phase 2: Design & Architecture

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

## Iterative Development Cycle (Phases 3-4-5)

**For each task on the todo list, execute the following cycle:**

### Phase 3: Implementation

**Objective**: Implement the specific task

**Activities**:

- Mark task as "in progress" in todo list
- Write code following project conventions and best practices
- Implement incrementally with clear, focused changes
- Handle errors and edge cases
- Follow security best practices
- Write clean, maintainable code with appropriate comments

**Deliverable**: Working implementation of the task

### Phase 4: Testing & Validation

**Objective**: Verify the implementation works correctly

**Activities**:

- **Functional Testing**: Test the feature works as intended
- **Edge Case Testing**: Test boundary conditions and error scenarios
- **Integration Testing**: Verify it works with existing code
- **Security Testing**: Check for common vulnerabilities (XSS, injection, etc.)
- **Regression Testing**: Ensure no existing functionality is broken
- **Manual Testing**: Test in the actual environment when possible

**Deliverable**: Verified, tested implementation

### Phase 5: Documentation

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

## Phase 6: Review & Deployment

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

## Checkpoints Summary

1. After Phase 1 (Requirements) → Get approval
2. After Phase 2 (Design + Todo List) → Get approval
3. **After each task completion** (Phases 3-4-5) → Wait for user confirmation
4. After Phase 6 (Final Review) → Get approval for deployment

**Note**: The per-task checkpoint (step 3) is critical for context window management. This pause allows the user to track token usage and prevents exceeding context limits.

## Phase Documentation

All development phases are tracked in a dedicated `*_DEVELOPMENT_TRACK.md` file:

- `docs/V*_PHASE1_REQUIREMENT_DECLARATION.md` - Requirement document (or PRD if user-facing)
- `docs/V*_PHASE2_DESIGN.md` - Design document (architecture, ER diagrams, API design)
- `docs/V*_PHASE3-6_DEVELOPMENT_TRACK.md` - Implementation log
