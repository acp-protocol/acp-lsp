---
name: project.status
description: Display current project status including phase progress, test results, and blockers
version: 1.0.0
category: project
phase: all
priority: P1
pattern: analyzer
inputs:
  - Memory files (phase-status.md, assumptions-log.md)
  - Test results from vitest
  - Git status
outputs:
  - Status dashboard display
  - JSON status report (--json flag)
handoffs:
  - target: review.phase
    context: "Status reviewed, proceed to phase gate if complete"
---

# Project Status Dashboard

## Purpose

Display comprehensive project status including phase progress, deliverable completion, test results, and blockers.

## Workflow

### Phase 1: Gather Status Data

```bash
# Get phase completion status
.claude/scripts/bash/check-phase-completion.sh --all --json

# Get test results (if tests exist)
pnpm test --reporter=json 2>/dev/null || echo '{"passed":0,"failed":0}'

# Get coverage
cat coverage/coverage-summary.json 2>/dev/null | jq '.total.lines.pct' || echo "N/A"
```

### Phase 2: Read Memory State

Read from `.claude/memory/`:
- `phase-status.md` - Current phase and blockers
- `assumptions-log.md` - Active assumptions
- `project-context.md` - Project configuration

### Phase 3: Display Dashboard

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                          ACP LSP PROJECT STATUS                            ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Project: acp-lsp                        Version: 0.1.0-dev                ║
║  Current Phase: 1 - Foundation           Week: 1 of 20                     ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  PHASE PROGRESS                                                            ║
║  Phase 1: Foundation          [████████░░░░░░░░░░░░]  40%                 ║
║  Phase 2: Core Intelligence   [░░░░░░░░░░░░░░░░░░░░]   0%                 ║
║  Phase 3: Navigation          [░░░░░░░░░░░░░░░░░░░░]   0%                 ║
║  Phase 4: Advanced Features   [░░░░░░░░░░░░░░░░░░░░]   0%                 ║
║  Phase 5: Polish              [░░░░░░░░░░░░░░░░░░░░]   0%                 ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  TEST STATUS                                                               ║
║  Unit Tests:        45 passed │  2 failed │  0 skipped                    ║
║  Coverage:          78.5% lines │ 72.3% branches                          ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

## Script Integration

```bash
# Full status check
.claude/scripts/bash/check-phase-completion.sh --all --json | jq .
```

## Completion Criteria

- [ ] All phases displayed with progress
- [ ] Test results shown if available
- [ ] Blockers listed from memory
- [ ] Active assumptions count shown
