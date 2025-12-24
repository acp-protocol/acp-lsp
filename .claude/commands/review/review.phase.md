---
name: review.phase
description: Conduct phase completion review with gate criteria verification
version: 1.0.0
category: review
phase: all
priority: P1
pattern: decision
inputs:
  - Current phase number
  - Test results
  - Phase status from memory
outputs:
  - Phase completion report
  - Gate pass/fail determination
handoffs:
  - target: Next phase commands
    context: "Phase approved, proceed to next phase"
---

# Phase Completion Review

## Purpose

Verify all phase deliverables are complete and gate criteria are met before proceeding.

## Workflow

### Phase 1: Gather Evidence

```bash
# Check phase completion
.claude/scripts/bash/check-phase-completion.sh --phase $PHASE --json

# Run tests
pnpm test --reporter=json

# Get coverage
pnpm test:coverage --reporter=json
```

### Phase 2: Evaluate Gate Criteria

#### Phase 1: Foundation Gates

| Criterion | Weight | Method |
|-----------|--------|--------|
| Server starts | Required | Manual test |
| Document sync works | Required | Integration test |
| TS/JS parsing works | Required | Unit test |
| Schema validation works | Required | Unit test |
| Coverage ≥ 70% | P0 | Coverage report |

#### Phase 2: Intelligence Gates

| Criterion | Weight | Method |
|-----------|--------|--------|
| All 8 parsers work | Required | Unit tests |
| Completions trigger | Required | Integration test |
| Hover shows docs | Required | Integration test |
| Coverage ≥ 75% | P0 | Coverage report |

### Phase 3: Make Decision

| All Required | P0 ≥ 90% | P1 ≥ 80% | Decision |
|--------------|----------|----------|----------|
| Yes | Yes | Yes | **PASS** |
| Yes | Yes | No | **CONDITIONAL** |
| No | Any | Any | **FAIL** |

### Phase 4: Document Result

Update `.claude/memory/phase-status.md`:

```markdown
## Phase X: [Name]
- **Status**: COMPLETE / CONDITIONAL / BLOCKED
- **Completion Date**: YYYY-MM-DD
- **Gate Result**: PASS / CONDITIONAL / FAIL
- **Blockers**: [List any blockers]
- **Notes**: [Any relevant notes]
```

## Report Template

```markdown
# Phase X Completion Report

## Summary
- **Phase**: X - [Name]
- **Date**: YYYY-MM-DD
- **Result**: PASS / CONDITIONAL / FAIL

## Deliverables
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| [Item] | ✓/✗ | [Link/test] |

## Test Results
- Unit Tests: X passed / Y failed
- Coverage: X%

## Gate Evaluation
| Gate | Met? | Notes |
|------|------|-------|
| [Criterion] | ✓/✗ | [Notes] |

## Decision
[PASS/CONDITIONAL/FAIL] - [Rationale]

## Action Items
- [ ] [Item if conditional/fail]
```

## Completion Criteria

- [ ] All deliverables checked
- [ ] Test results gathered
- [ ] Gate criteria evaluated
- [ ] Memory updated
- [ ] Report generated
