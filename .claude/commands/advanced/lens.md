---
name: lens
description: Implement Code Lens for constraint indicators, caller counts, and variable usages
version: 1.0.0
category: advanced
phase: 4
priority: P2
pattern: generator
inputs:
  - Cache call graph
  - Constraint data
  - Variable usage tracking
outputs:
  - packages/server/src/providers/codeLens.ts
  - Clickable lens commands
handoffs:
  - target: advanced:inlay
    context: "Lens implemented, inlay hints can complement with inline info"
  - target: polish:performance
    context: "Lens may need lazy resolution for large files"
---

# Code Lens Provider

## Purpose

Implement Code Lens to show constraint indicators, caller/callee counts, and variable usage counts inline in the editor.

## Prerequisites

- [ ] Semantic tokens ready
- [ ] Cache service with call graph
- [ ] Variable service with usage tracking

## Workflow

### Phase 1: Generate Provider from Template

```bash
.claude/scripts/bash/generate-provider.sh codeLens
```

### Phase 2: Implement Lens Types

| Type | Location | Content |
|------|----------|---------|
| Lock level | File top / symbol | 🔒 frozen |
| Callers | Symbol line | → 5 callers |
| Callees | Symbol line | ← calls 3 |
| Usages | Vars file | ⟲ 8 usages |
| Expired hack | Hack annotation | ⚠️ Expired 3 days ago |

### Phase 3: Validate Implementation

```bash
.claude/scripts/bash/validate-provider.sh codeLens
```

## Completion Criteria

- [ ] Lock level lenses with icons
- [ ] Caller count lenses
- [ ] Callee count lenses
- [ ] Variable usage lenses
- [ ] Expired hack warnings
- [ ] Lens resolution (lazy)
- [ ] Commands navigate correctly
- [ ] Unit tests pass
