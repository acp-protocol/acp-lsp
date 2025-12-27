---
name: variables
description: Implement variable resolution service for $SYM_, $FILE_, and $DOM_ references
version: 1.0.0
category: intelligence
phase: 2
priority: P1
pattern: generator
inputs:
  - vars.schema.json
  - Cache symbols, files, domains
  - Variable expansion rules from spec
outputs:
  - packages/server/src/services/variable.ts
  - Variable resolution pipeline
  - Circular reference detection
handoffs:
  - target: navigation:definition
    context: "Variables resolved, definition can navigate to var declarations"
---

# Variable Resolution Service

## Purpose

Implement a complete variable resolution service that expands `$PREFIX_NAME.modifier` references to their full values.

## Prerequisites

- [ ] Hover provider sharing metadata lookups
- [ ] Cache service providing symbols/files/domains
- [ ] Vars file loader implemented

## Workflow

### Phase 1: Generate Service from Template

```bash
.claude/scripts/bash/generate-service.sh variable
```

### Phase 2: Implement Resolution Pipeline

1. Parse variable reference: `$PREFIX_NAME.modifier`
2. Validate naming pattern: `^[A-Z][A-Z0-9_]+$`
3. Lookup in `.acp.vars.json`
4. If not found, check auto-generated from cache
5. Resolve value based on type (symbol/file/domain)
6. Apply modifier transformation (.full, .ref, .signature)
7. Return expanded text or error diagnostic

### Phase 3: Circular Reference Detection

Track expansion chain, error at depth > 10:

```typescript
if (this.expansionStack.has(name)) {
  return { error: `[CIRCULAR: ${[...this.expansionStack, name].join(' → ')}]` };
}
```

### Phase 4: Validate Implementation

```bash
.claude/scripts/bash/validate-service.sh variable
```

## Completion Criteria

- [ ] Symbol variables resolve from cache
- [ ] File variables resolve from cache  
- [ ] Domain variables resolve from cache
- [ ] All modifiers (.full, .ref, .signature) work
- [ ] Circular reference detection works
- [ ] Escape sequence ($$) handling works
- [ ] Max depth (10) enforced
- [ ] Unit tests pass
