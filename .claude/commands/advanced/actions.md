---
name: actions
description: Implement Code Actions and Quick Fixes for ACP diagnostics
version: 1.0.0
category: advanced
phase: 4
priority: P1
pattern: generator
inputs:
  - Diagnostics from validation
  - Cache constraint data
  - Annotation metadata
outputs:
  - packages/server/src/providers/codeActions.ts
  - Quick fixes for all diagnostic types
  - Refactoring actions
handoffs:
  - target: advanced:semantic
    context: "Code actions ready, semantic tokens can indicate actionable items"
  - target: advanced:lens
    context: "Actions available, lens can show action counts"
---

# Code Actions Provider

## Purpose

Implement Code Actions (lightbulb menu) including quick fixes for diagnostics, refactoring actions, and source actions for ACP files.

## Prerequisites

- [ ] Cache integration complete
- [ ] Diagnostics provider publishing errors/warnings
- [ ] Variable service operational

## Workflow

### Phase 1: Generate Provider from Template

```bash
.claude/scripts/bash/generate-provider.sh codeActions
```

### Phase 2: Implement Quick Fix Matrix

| Diagnostic | Quick Fix |
|------------|-----------|
| E201 Missing directive | Add ` - ` at position |
| E202 Empty directive | Position cursor after ` - ` |
| E101 Unknown namespace | Suggest closest matches |
| E102 Invalid lock level | Offer all valid levels |
| E105 Undefined variable | Create in vars file |
| W010 Stale cache | Run `acp index` |
| W001 Orphan annotation | Remove or move annotation |

### Phase 3: Validate Implementation

```bash
.claude/scripts/bash/validate-provider.sh codeActions
```

## Completion Criteria

- [ ] Quick fixes for all diagnostic types
- [ ] Refactoring: Extract variable
- [ ] Refactoring: Change lock level
- [ ] Source: Generate annotations
- [ ] Source: Sort annotations
- [ ] Source: Fix all
- [ ] Commands registered and working
- [ ] Unit tests pass
