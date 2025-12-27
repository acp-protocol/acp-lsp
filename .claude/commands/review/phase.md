---
name: phase
description: Conduct phase gate review to verify all deliverables and handoffs are complete
version: 1.0.0
category: review
phase: all
priority: P0
pattern: orchestrator
inputs:
  - Phase completion status
  - Deliverable checklist
  - Test results
outputs:
  - Phase review report
  - Go/no-go decision
  - Action items for gaps
handoffs:
  - target: (next phase entry command)
    context: "Phase review passed, proceed to next phase"
---

# Phase Gate Review

## Purpose

Verify all deliverables for a phase are complete, tests pass, and the project is ready to proceed to the next phase.

## Workflow

### Phase 1: Run Review Script

```bash
.claude/scripts/bash/review-phase.sh <phase-number>
```

### Phase 2: Verify Deliverables

The script checks:
- All expected files exist
- Tests pass with required coverage
- No critical blockers
- Documentation updated

### Phase 3: Generate Report

Output includes:
- Deliverable status table
- Test results summary
- Coverage metrics
- Blocker list
- Go/no-go recommendation

## Phase Gate Criteria

| Phase | Exit Criteria |
|-------|---------------|
| 1 | Server runs, basic parsing works |
| 2 | All parsers, completions, hover work |
| 3 | Navigation features work |
| 4 | Advanced features work |
| 5 | Extension published, docs complete |

## Completion Criteria

- [ ] All deliverables for phase verified
- [ ] Tests passing with required coverage
- [ ] No critical blockers
- [ ] Documentation updated
- [ ] Review report generated
- [ ] Go/no-go decision made
