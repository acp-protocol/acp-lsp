---
name: inlay
description: Implement Inlay Hints for variable expansion, constraint details, and domain tags
version: 1.0.0
category: advanced
phase: 4
priority: P2
pattern: generator
inputs:
  - Variable resolution results
  - Constraint inheritance
  - Domain assignments
outputs:
  - packages/server/src/providers/inlayHints.ts
  - Inline variable expansions
  - Constraint indicators
handoffs:
  - target: polish:performance
    context: "Inlay hints may need debouncing for performance"
  - target: review:phase
    context: "Phase 4 advanced features complete, ready for review"
---

# Inlay Hints Provider

## Purpose

Implement Inlay Hints to show inline information such as variable expansion previews, constraint inheritance, and domain tags.

## Prerequisites

- [ ] Code lens implemented
- [ ] Variable service with full expansion
- [ ] Cache constraint data

## Workflow

### Phase 1: Generate Provider from Template

```bash
.claude/scripts/bash/generate-provider.sh inlayHints
```

### Phase 2: Implement Hint Types

| Hint Type | Position | Content |
|-----------|----------|---------|
| Lock level | File start | 🔒 frozen |
| Domains | File start | 📂 auth 📂 core |
| Variable expansion | After $VAR | → validateSession(...) |
| Inheritance | After @acp:lock | ← from project |

### Phase 3: Configuration

```jsonc
{
  "acp.inlayHints.showLockLevels": true,
  "acp.inlayHints.showDomains": true,
  "acp.inlayHints.showVariableExpansions": true,
  "acp.inlayHints.showInheritance": false
}
```

### Phase 4: Validate Implementation

```bash
.claude/scripts/bash/validate-provider.sh inlayHints
```

## Completion Criteria

- [ ] Lock level hints at file start
- [ ] Domain hints when domains exist
- [ ] Variable expansion preview hints
- [ ] Inheritance source hints
- [ ] Tooltips with full details
- [ ] Configurable via settings
- [ ] Performance acceptable
- [ ] Unit tests pass
