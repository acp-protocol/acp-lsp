---
name: cache
description: Implement deep cache integration for cross-file navigation and call graph
version: 1.0.0
category: navigation
phase: 3
priority: P1
pattern: generator
inputs:
  - cache.schema.json
  - Call graph structure
  - Symbol/file/domain indices
outputs:
  - packages/server/src/services/cache.ts (enhanced)
  - Call graph navigation
  - Staleness detection
handoffs:
  - target: advanced:actions
    context: "Cache integration complete, code actions can leverage constraint data"
  - target: review:phase
    context: "Phase 3 navigation complete, ready for phase gate review"
---

# Cache Integration Service

## Purpose

Enhance the cache service with deep integration features including call graph navigation, staleness detection, and cross-file symbol resolution.

## Prerequisites

- [ ] Symbols provider operational
- [ ] Basic cache loading working
- [ ] File system watcher configured

## Workflow

### Phase 1: Enhance Service from Template

```bash
.claude/scripts/bash/generate-service.sh cache --enhance
```

### Phase 2: Implement Cache Queries

| Query | Method | Returns |
|-------|--------|---------|
| Get callers | `getCallers(name)` | `string[]` |
| Get callees | `getCallees(name)` | `string[]` |
| Get hierarchy | `getCallHierarchy(name, dir, depth)` | `CallHierarchyNode` |
| Find symbol | `findSymbol(name, context?)` | `CacheSymbol` |
| Check staleness | `getStalenessReport()` | `StalenessReport` |

### Phase 3: Staleness Detection

Compare `generated_at` and source file timestamps to detect stale cache.

### Phase 4: Validate Implementation

```bash
.claude/scripts/bash/validate-service.sh cache
```

## Completion Criteria

- [ ] Cache loads and validates
- [ ] Staleness detection works
- [ ] Call graph navigation (callers/callees)
- [ ] Call hierarchy tree building
- [ ] Symbol/file/domain lookup
- [ ] File watching triggers reload
- [ ] Source file changes mark stale
- [ ] Unit tests pass
