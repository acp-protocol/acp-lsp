---
name: references
description: Implement Find References for variables, symbols, domains, and constraints
version: 1.0.0
category: navigation
phase: 3
priority: P1
pattern: generator
inputs:
  - Cache call graph (forward/reverse)
  - Variable usages across workspace
  - Domain/constraint associations
outputs:
  - packages/server/src/providers/references.ts
  - Cross-file reference resolution
handoffs:
  - target: navigation:symbols
    context: "References implemented, symbols can show reference counts"
  - target: navigation:cache
    context: "Reference resolution needs cache integration improvements"
---

# Find References Provider

## Purpose

Implement Find All References (Shift+F12) to locate all usages of variables, symbols, domains, and constraints across the workspace.

## Prerequisites

- [ ] Definition provider implemented (shares resolution)
- [ ] Cache service with call graph data
- [ ] Workspace file scanning

## Workflow

### Phase 1: Generate Provider from Template

```bash
.claude/scripts/bash/generate-provider.sh references
```

### Phase 2: Implement Reference Types

| Source | References Found |
|--------|------------------|
| Variable in vars file | All `$VAR` usages |
| Symbol name | All callers from call graph |
| Domain name | All files/symbols in domain |
| Lock level (`frozen`) | All files with that level |

### Phase 3: Validate Implementation

```bash
.claude/scripts/bash/validate-provider.sh references
```

## Completion Criteria

- [ ] Variable references found across workspace
- [ ] Symbol callers from call graph
- [ ] Domain files/symbols listed
- [ ] Lock level files found
- [ ] Include/exclude declaration works
- [ ] Performance acceptable for large projects
- [ ] Unit tests pass
