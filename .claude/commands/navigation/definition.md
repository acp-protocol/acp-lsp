---
name: definition
description: Implement Go to Definition for variables, symbols, and annotations
version: 1.0.0
category: navigation
phase: 3
priority: P1
pattern: generator
inputs:
  - Variable service for $VAR resolution
  - Cache service for symbol lookup
  - Document manager for file positions
outputs:
  - packages/server/src/providers/definition.ts
  - Location resolution for all navigable elements
handoffs:
  - target: navigation:references
    context: "Definition implemented, references can share symbol resolution"
  - target: navigation:symbols
    context: "Definition navigation ready, symbols can link to definitions"
---

# Go to Definition Provider

## Purpose

Implement Go to Definition (F12) functionality for ACP elements including variable references, symbol names, domain references, and annotation values.

## Prerequisites

- [ ] Variable service operational
- [ ] Cache service with symbol lookup
- [ ] Hover provider (shares resolution logic)

## Workflow

### Phase 1: Generate Provider from Template

```bash
.claude/scripts/bash/generate-provider.sh definition
```

### Phase 2: Implement Navigation Targets

| Source | Target |
|--------|--------|
| `$SYM_*` variable | Variable definition in `.acp.vars.json` |
| Symbol variable value | Symbol location in source file |
| File variable value | File location |
| Domain reference | Domain section in config/cache |
| `@acp:ref` URL | External documentation (open browser) |

### Phase 3: Validate Implementation

```bash
.claude/scripts/bash/validate-provider.sh definition
```

## Completion Criteria

- [ ] Variable definitions navigate to .acp.vars.json
- [ ] Symbol names navigate to source file
- [ ] Qualified names in JSON navigate correctly
- [ ] Domain references find config/cache location
- [ ] @acp:ref URLs open in browser
- [ ] Unit tests pass
- [ ] Latency < 100ms
