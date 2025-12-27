---
name: symbols
description: Implement Document Symbols and Workspace Symbols for ACP navigation
version: 1.0.0
category: navigation
phase: 3
priority: P1
pattern: generator
inputs:
  - Annotation parser output
  - Cache symbols and domains
outputs:
  - packages/server/src/providers/symbols.ts
  - Document outline for ACP files
  - Workspace-wide symbol search
handoffs:
  - target: navigation:cache
    context: "Symbols provider ready, cache integration can enhance with call graph"
  - target: advanced:lens
    context: "Symbol structure available for code lens placement"
---

# Document & Workspace Symbols Provider

## Purpose

Implement document outline (Ctrl+Shift+O) and workspace symbol search (Ctrl+T) for ACP annotations, symbols, and cache navigation.

## Prerequisites

- [ ] References provider (shares symbol resolution)
- [ ] Cache service operational
- [ ] Annotation parser

## Workflow

### Phase 1: Generate Provider from Template

```bash
.claude/scripts/bash/generate-provider.sh symbols
```

### Phase 2: Implement Query Patterns

| Pattern | Matches |
|---------|---------|
| `@domain:auth` | All files/symbols in auth domain |
| `@lock:frozen` | All frozen files |
| `@critical` | All critical annotations |
| `#validateSession` | Symbol by name |
| `auth session` | General search |

### Phase 3: Validate Implementation

```bash
.claude/scripts/bash/validate-provider.sh symbols
```

## Completion Criteria

- [ ] Document outline for source files
- [ ] Cache file outline with hierarchy
- [ ] Config/vars file outlines
- [ ] Workspace symbol search
- [ ] Query pattern parsing
- [ ] Performance < 100ms
- [ ] Unit tests pass
